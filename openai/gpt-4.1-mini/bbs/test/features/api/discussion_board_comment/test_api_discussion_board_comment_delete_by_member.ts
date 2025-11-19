import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_comment_delete_by_member(
  connection: api.IConnection,
) {
  // 1. Register first member (comment author)
  const member1Email: string = typia.random<string & tags.Format<"email">>();
  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: "validPassword123",
        nickname: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member1);

  // 2. Create discussion board article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          content: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3. Post comment
  const href = `https://example.com/article/${article.id}`;
  const referrer = `https://example.com/`;
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.discussionBoardComments.create(
      connection,
      {
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 10,
            wordMax: 15,
          }),
          discussion_board_article_id: article.id,
          href: href as string & tags.Format<"uri">,
          referrer: referrer as string & tags.Format<"uri">,
          ip: null,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 4. Delete comment with same member
  await api.functional.discussionBoard.member.discussionBoardComments.erase(
    connection,
    {
      id: comment.id,
    },
  );

  // Deleting comment does not return any data, ensure no error thrown

  // 5. Register second member to test unauthorized deletion
  const member2Email: string = typia.random<string & tags.Format<"email">>();
  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: "validPassword123",
        nickname: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member2);

  // 6. Second member attempts to delete first member's comment again (should error)
  await TestValidator.error(
    "unauthorized member cannot delete others' comment",
    async () => {
      await api.functional.discussionBoard.member.discussionBoardComments.erase(
        connection,
        {
          id: comment.id,
        },
      );
    },
  );
}
