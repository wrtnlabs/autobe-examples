import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_comment_delete_by_author(
  connection: api.IConnection,
) {
  // 1. Register a new member (author)
  const password = RandomGenerator.alphaNumeric(10) + "A!"; // >=12 chars
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: typia.random<string & tags.Format<"email">>(),
        password,
        href: "https://example.com/",
        referrer: "https://referrer.example.com/",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // 2. Create an article under the authenticated member
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        state: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3. Create a comment on the article as the same member
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Basic business assertion: comment belongs to created article
  TestValidator.equals(
    "comment belongs to created article",
    comment.articleId,
    article.id,
  );

  // 4. Author performs soft-delete of their own comment
  await api.functional.discussionBoard.member.articles.comments.erase(
    connection,
    {
      articleId: article.id,
      commentId: comment.id,
    },
  );

  // 5. Validation: erase completed without throwing.
  // Note: No GET/list endpoint for comments was provided; therefore we cannot assert listing exclusion or deletedAt via SDK.
  TestValidator.predicate("delete operation completed without throwing", true);
}
