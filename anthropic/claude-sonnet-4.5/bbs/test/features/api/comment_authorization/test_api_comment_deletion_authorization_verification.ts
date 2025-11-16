import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_comment_deletion_authorization_verification(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (comment author)
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: firstMemberEmail,
        password: "password123",
        username: RandomGenerator.name(),
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(firstMember);

  // Step 2: First member creates an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: First member posts a comment on the article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Create second member account (this automatically switches authentication)
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: secondMemberEmail,
        password: "password456",
        username: RandomGenerator.name(),
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(secondMember);

  // Step 5: Second member attempts to delete first member's comment - MUST FAIL
  await TestValidator.error(
    "unauthorized member cannot delete another member's comment",
    async () => {
      await api.functional.discussionBoard.member.articles.comments.erase(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
        },
      );
    },
  );
}
