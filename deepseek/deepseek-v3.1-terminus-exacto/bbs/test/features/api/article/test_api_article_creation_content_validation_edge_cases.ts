import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_creation_content_validation_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create a valid section for testing
  const section =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
    );
  typia.assert(section);
  // Test 1: Minimum title length (5 characters)
  const validArticle =
    await api.functional.discussionBoard.admin.articles.create(
      adminConnection,
      {
        body: {
          title: "Test", // 4 characters - should fail
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 3,
          }),
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(validArticle);
  // Test 2: Maximum title length (200 characters)
  const longTitle = RandomGenerator.alphabets(201); // 201 characters - should fail
  await TestValidator.error("title exceeds maximum length", async () => {
    await api.functional.discussionBoard.admin.articles.create(
      adminConnection,
      {
        body: {
          title: longTitle,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 3,
          }),
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  });
  // Test 3: Minimum content length (50 characters)
  const shortContent = RandomGenerator.alphabets(49); // 49 characters - should fail
  await TestValidator.error("content below minimum length", async () => {
    await api.functional.discussionBoard.admin.articles.create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: shortContent,
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  });
  // Test 4: Invalid section ID
  const invalidSectionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("invalid section ID", async () => {
    await api.functional.discussionBoard.admin.articles.create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 3,
          }),
          discussion_board_section_id: invalidSectionId,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  });
  // Test 5: Valid boundary cases
  const validBoundaryArticle =
    await api.functional.discussionBoard.admin.articles.create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.alphabets(5), // Exactly 5 characters
          content: RandomGenerator.alphabets(50), // Exactly 50 characters
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(validBoundaryArticle);
  // Test 6: Maximum title length boundary (200 characters)
  const maxTitle = RandomGenerator.alphabets(200); // Exactly 200 characters
  const validMaxTitleArticle =
    await api.functional.discussionBoard.admin.articles.create(
      adminConnection,
      {
        body: {
          title: maxTitle,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 3,
          }),
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(validMaxTitleArticle);
}
