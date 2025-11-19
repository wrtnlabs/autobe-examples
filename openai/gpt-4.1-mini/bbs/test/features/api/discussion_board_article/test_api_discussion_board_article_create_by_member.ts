import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_article_create_by_member(
  connection: api.IConnection,
) {
  // 1. Member registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    email: memberEmail,
    password: "TestPass1234",
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(member);

  // 2. Create new discussion board article as authenticated member
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 6, wordMax: 10 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      { body: articleCreateBody },
    );
  typia.assert(article);

  // 3. Validate the article fields
  TestValidator.predicate(
    "article.id should be a valid UUID",
    typeof article.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        article.id,
      ),
  );
  TestValidator.equals(
    "article title should match the request",
    article.title,
    articleCreateBody.title,
  );
  TestValidator.equals(
    "article content should match the request",
    article.content,
    articleCreateBody.content,
  );
  TestValidator.equals(
    "discussion_board_member_id should match authorized member id",
    article.discussion_board_member_id,
    member.id,
  );
  TestValidator.predicate(
    "article.created_at should be a string in ISO 8601 format",
    typeof article.created_at === "string" &&
      !isNaN(Date.parse(article.created_at)),
  );
  TestValidator.predicate(
    "article.updated_at should be a string in ISO 8601 format",
    typeof article.updated_at === "string" &&
      !isNaN(Date.parse(article.updated_at)),
  );
  // deleted_at is nullable and optional, so null or undefined is valid
  TestValidator.predicate(
    "article.deleted_at should be undefined or null",
    article.deleted_at === undefined || article.deleted_at === null,
  );
}
