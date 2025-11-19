import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_article_retrieval_by_any_user(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new member user to join the discussion board
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "StrongPass123!",
        nickname: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a discussion board article as the authenticated member
  const createArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: createArticleBody,
      },
    );
  typia.assert(article);

  // 3. Retrieve the created article by its UUID without authentication
  // Create a fresh connection without Authorization header
  const guestConn: api.IConnection = { ...connection, headers: {} };
  const retrievedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.discussionBoardArticles.at(guestConn, {
      id: article.id,
    });
  typia.assert(retrievedArticle);

  // 4. Validate article details
  TestValidator.equals(
    "article title matches",
    retrievedArticle.title,
    createArticleBody.title,
  );
  TestValidator.equals(
    "article content matches",
    retrievedArticle.content,
    createArticleBody.content,
  );
  TestValidator.equals(
    "article author matches",
    retrievedArticle.discussion_board_member_id,
    member.id,
  );
  TestValidator.predicate(
    "article created_at is ISO date",
    typeof retrievedArticle.created_at === "string" &&
      Boolean(retrievedArticle.created_at),
  );
  TestValidator.predicate(
    "article updated_at is ISO date",
    typeof retrievedArticle.updated_at === "string" &&
      Boolean(retrievedArticle.updated_at),
  );
  TestValidator.equals(
    "article not soft-deleted",
    retrievedArticle.deleted_at ?? null,
    null,
  );
}
