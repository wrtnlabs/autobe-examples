import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_article_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new member (join) to obtain authentication tokens
  const memberBody = {
    email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "password1234",
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // 2. Create a new discussion board article as authenticated member
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  // 3. Validate article properties
  TestValidator.predicate(
    "created article has an id",
    typeof article.id === "string" && article.id.length > 0,
  );
  TestValidator.equals(
    "article title matches",
    article.title,
    articleBody.title,
  );
  TestValidator.equals(
    "article content matches",
    article.content,
    articleBody.content,
  );
  TestValidator.equals(
    "article discussion_board_member_id matches member id",
    article.discussion_board_member_id,
    member.id,
  );
  TestValidator.predicate(
    "article created_at is valid ISO string",
    typeof article.created_at === "string" &&
      !isNaN(Date.parse(article.created_at)),
  );
  TestValidator.predicate(
    "article updated_at is valid ISO string",
    typeof article.updated_at === "string" &&
      !isNaN(Date.parse(article.updated_at)),
  );
  TestValidator.equals(
    "article deleted_at is null or undefined",
    article.deleted_at === null || article.deleted_at === undefined,
    true,
  );
}
