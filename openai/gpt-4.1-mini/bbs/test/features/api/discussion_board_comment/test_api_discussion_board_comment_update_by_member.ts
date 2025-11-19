import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_comment_update_by_member(
  connection: api.IConnection,
) {
  // 1. Register and authenticate author member
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: authorEmail,
        password: "password123",
        nickname: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(author);

  // 2. Create a discussion board article by author
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 5 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3. Create a comment on the article by author
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
    discussion_board_article_id: article.id,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardComment.ICreate;
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.discussionBoardComments.create(
      connection,
      {
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 4. Update the comment content - success case
  const commentUpdateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.IUpdate;

  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.discussionBoardComments.update(
      connection,
      {
        id: comment.id,
        body: commentUpdateBody,
      },
    );
  typia.assert(updatedComment);

  // Validate that the updated content matches
  TestValidator.equals(
    "comment content updated",
    updatedComment.content,
    commentUpdateBody.content,
  );

  // Validate that the author is unchanged
  TestValidator.equals(
    "comment author id unchanged",
    updatedComment.author.id,
    comment.author.id,
  );

  // Validate that the comment id is unchanged
  TestValidator.equals("comment ID unchanged", updatedComment.id, comment.id);

  // 5. Register another member as different user
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: otherEmail,
        password: "password123",
        nickname: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(otherMember);

  // 6. Attempt unauthorized update of comment by different member
  await TestValidator.error("non-author cannot update comment", async () => {
    // Use a fresh unauthenticated connection object to simulate the other member
    const otherConnection: api.IConnection = { ...connection, headers: {} };

    // Join another member to get valid authentication
    await api.functional.auth.member.join(otherConnection, {
      body: {
        email: otherEmail,
        password: "password123",
        nickname: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });

    // Attempt to update the comment using the otherConnection with that other member
    await api.functional.discussionBoard.member.discussionBoardComments.update(
      otherConnection,
      {
        id: comment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  });
}
