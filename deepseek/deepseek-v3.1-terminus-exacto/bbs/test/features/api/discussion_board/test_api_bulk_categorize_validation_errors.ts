import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachmentCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategoryMapping";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_bulk_categorize_validation_errors(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create valid target section
  const validSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(validSection);
  // Create member and articles for valid mappings
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  const validArticle1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: validSection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(validArticle1);
  const validArticle2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: validSection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(validArticle2);
  // Prepare invalid scenarios
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  // Test bulk categorization with mixed valid/invalid mappings
  // Since the actual bulk categorization request structure is not properly defined in the DTOs,
  // we'll test the available endpoint functionality
  const bulkResponse =
    await api.functional.discussionBoard.admin.bulk.categorize.bulkCategorize(
      adminConnection,
      {
        body: {
          // Using available filtering parameters to test validation
          attachment_id: validArticle1.id,
          category_id: validSection.id,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(bulkResponse);
  // Validate response structure has mappings array
  TestValidator.predicate(
    "response has mappings array",
    Array.isArray(bulkResponse.mappings),
  );
  // Test validation error scenarios
  await TestValidator.error("non-existent attachment should fail", async () => {
    await api.functional.discussionBoard.admin.bulk.categorize.bulkCategorize(
      adminConnection,
      {
        body: {
          attachment_id: nonExistentArticleId,
          category_id: validSection.id,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  });
  await TestValidator.error("non-existent category should fail", async () => {
    await api.functional.discussionBoard.admin.bulk.categorize.bulkCategorize(
      adminConnection,
      {
        body: {
          attachment_id: validArticle1.id,
          category_id: nonExistentSectionId,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  });
  // Test with valid parameters to ensure successful operation
  const validResponse =
    await api.functional.discussionBoard.admin.bulk.categorize.bulkCategorize(
      adminConnection,
      {
        body: {
          attachment_id: validArticle2.id,
          category_id: validSection.id,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(validResponse);
  TestValidator.predicate(
    "valid request should succeed",
    Array.isArray(validResponse.mappings),
  );
}
