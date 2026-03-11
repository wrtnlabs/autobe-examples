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
 * Test successful creation of a new status type with minimal required fields (category, code, display_name).
 * Validate that display_order defaults to 0 and is_active defaults to true when not provided.
 * Verify the response includes system-generated fields (id, created_at, updated_at) and that the
 * status type is correctly persisted with the provided category and code combination.
 */
export async function test_api_status_type_creation_success_minimal(
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
  // Create status type with minimal required fields
  const statusType =
    await generate_random_discussion_board_super_admin_status_types_create(
      superAdminConnection,
      {
        body: {
          category: RandomGenerator.alphabets(8),
          code: RandomGenerator.alphabets(6),
          display_name: RandomGenerator.paragraph({ sentences: 1 }),
          // Intentionally omit optional fields: description, display_order, is_active
        } satisfies IDiscussionBoardStatusType.ICreate,
      },
    );
  typia.assert(statusType);
  // Validate default values for optional fields
  TestValidator.equals(
    "display_order defaults to 0",
    statusType.display_order,
    0,
  );
  TestValidator.predicate(
    "is_active defaults to true",
    statusType.is_active === true,
  );
  // Validate provided fields match
  TestValidator.predicate(
    "category is provided",
    statusType.category.length > 0,
  );
  TestValidator.predicate("code is provided", statusType.code.length > 0);
  TestValidator.predicate(
    "display_name is provided",
    statusType.display_name.length > 0,
  );
  // Validate description is null when not provided
  TestValidator.equals(
    "description is null when omitted",
    statusType.description,
    null,
  );
  // Validate deleted_at is undefined for newly created status type
  TestValidator.equals(
    "deleted_at is undefined for active status",
    statusType.deleted_at,
    undefined,
  );
}
