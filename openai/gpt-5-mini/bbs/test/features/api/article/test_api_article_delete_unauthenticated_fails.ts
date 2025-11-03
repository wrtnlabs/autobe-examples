import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_article_delete_unauthenticated_fails(
  connection: api.IConnection,
) {
  // 1) Register a fresh member (author)
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/", // required session context
    referrer: "https://example.com/", // required session context
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(member);

  // 2) Create an article as the authenticated member
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // 3) Attempt to delete the article WITHOUT authentication
  // Create an unauthenticated connection by clearing headers per guidelines
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated deletion should fail",
    async () => {
      await api.functional.discussionBoard.member.articles.erase(unauthConn, {
        articleId: article.id,
      });
    },
  );

  // 4) Ensure the authenticated author can delete the article
  // (original `connection` still holds Authorization set by join)
  await api.functional.discussionBoard.member.articles.erase(connection, {
    articleId: article.id,
  });

  // If no exception was thrown, deletion by the author succeeded
  TestValidator.predicate("authenticated deletion should succeed", true);
}
