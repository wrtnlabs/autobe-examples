import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
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
import { generate_random_discussion_board_super_admin_status_types_create } from "../../../generate/generate_random_discussion_board_super_admin_status_types_create";
import { prepare_random_discussion_board_status_type } from "../../../prepare/prepare_random_discussion_board_status_type";

/**
 * Test business validation that prevents creating duplicate status types with the same category and code combination.
 *
 * After authenticating as a super administrator, first create a status type with specific category and code,
 * then attempt to create another status type with identical category and code but different display_name.
 * Validate that the system rejects the duplicate creation with appropriate error response, preserving
 * data integrity across the centralized enumeration system.
 *
 * This tests the critical business rule that status types must have unique (category, code) combinations.
 */
export async function test_api_status_type_creation_duplicate_category_code(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Define common category and code for duplicate testing
  const category = "article";
  const code = "draft";
  // Create first status type
  const firstStatusType =
    await generate_random_discussion_board_super_admin_status_types_create(
      superAdminConnection,
      {
        body: {
          category,
          code,
          display_name: "First Draft Status",
          description: "Initial draft status for articles",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardStatusType.ICreate,
      },
    );
  typia.assert(firstStatusType);
  // Attempt to create duplicate status type with same category and code but different display_name
  await TestValidator.error(
    "duplicate status type creation should fail",
    async () => {
      await generate_random_discussion_board_super_admin_status_types_create(
        superAdminConnection,
        {
          body: {
            category,
            code,
            display_name: "Second Draft Status",
            description: "Attempted duplicate status type",
            display_order: 2,
            is_active: true,
          } satisfies IDiscussionBoardStatusType.ICreate,
        },
      );
    },
  );
  // Validate that the first status type still exists and is unchanged
  TestValidator.equals(
    "category should match",
    firstStatusType.category,
    category,
  );
  TestValidator.equals("code should match", firstStatusType.code, code);
  TestValidator.equals(
    "display_name should remain unchanged",
    firstStatusType.display_name,
    "First Draft Status",
  );
}
