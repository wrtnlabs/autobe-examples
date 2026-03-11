import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test duplication validation when checking a section topic that is similar to existing sections.
 * Create a section with a specific topic, then use the duplication validation endpoint to check
 * for topical conflicts. Verify that the operation correctly detects potential duplication using
 * string similarity metrics, returns isDuplicate: true with duplicateType: 'section_topic',
 * and provides conflict details with similarity scores.
 */
export async function test_api_duplication_validation_section_topic_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create an initial section with a specific topic
  const sectionTopic = "Technology and Innovation";
  const initialSection =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: sectionTopic,
          description:
            "Discussion about latest technology trends and innovations",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(initialSection);
  // 3. Test duplication validation with similar topic
  const similarTopic = "Technology & Innovation"; // Similar but not identical
  const validationResult =
    await api.functional.discussionBoard.superAdmin.duplication.validate(
      superAdminConnection,
      {
        body: {
          search: similarTopic,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(validationResult);
  // 4. Validate duplication detection
  TestValidator.equals(
    "should detect section topic duplication",
    validationResult.isDuplicate,
    true,
  );
  TestValidator.equals(
    "duplicate type should be section_topic",
    validationResult.duplicateType,
    "section_topic",
  );
  // 5. Validate conflict details exist
  TestValidator.predicate(
    "conflict details should be provided",
    validationResult.conflictDetails !== undefined,
  );
  if (validationResult.conflictDetails) {
    TestValidator.equals(
      "existing value should match initial section",
      validationResult.conflictDetails.existingValue,
      sectionTopic,
    );
    TestValidator.equals(
      "entity type should be section",
      validationResult.conflictDetails.entityType,
      "section",
    );
    TestValidator.predicate(
      "similarity score should be provided",
      validationResult.conflictDetails.similarityScore !== undefined,
    );
  }
}
