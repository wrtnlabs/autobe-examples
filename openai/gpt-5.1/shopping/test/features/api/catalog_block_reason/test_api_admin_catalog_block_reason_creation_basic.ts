import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

/**
 * Basic catalog block reason creation flow for admin.
 *
 * This test validates that:
 *
 * - An admin can join the system and obtain an authenticated context
 * - The admin can create catalog block reasons with minimal required fields
 * - System-managed fields (id, timestamps, deleted_at) are populated correctly
 * - Multiple reasons can be created as long as their `code` values are unique
 *
 * Steps:
 *
 * 1. Join as a new admin account using POST /auth/admin/join.
 * 2. Using the authenticated admin connection, call POST
 *    /shoppingMall/admin/catalogBlockReasons with an
 *    IShoppingMallCatalogBlockReason.ICreate payload that omits optional
 *    description.
 * 3. Assert created entity type and business expectations.
 * 4. Repeat creation with a different `code` to confirm further successful
 *    creations.
 */
export async function test_api_admin_catalog_block_reason_creation_basic(
  connection: api.IConnection,
) {
  // 1. Admin join to establish authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create first catalog block reason with minimal required fields
  const baseCode = RandomGenerator.alphaNumeric(12);
  const reasonCreateBody1 = {
    code: `policy_violation_${baseCode}`,
    name: "Policy Violation - Basic",
    severity_level: "medium",
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const createdReason1 =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      {
        body: reasonCreateBody1,
      },
    );
  typia.assert<IShoppingMallCatalogBlockReason>(createdReason1);

  // 3. Validate returned fields for first creation
  TestValidator.predicate(
    "createdReason1.id should be non-empty string",
    typeof createdReason1.id === "string" && createdReason1.id.length > 0,
  );

  TestValidator.equals(
    "createdReason1.code matches request",
    createdReason1.code,
    reasonCreateBody1.code,
  );
  TestValidator.equals(
    "createdReason1.name matches request",
    createdReason1.name,
    reasonCreateBody1.name,
  );
  TestValidator.equals(
    "createdReason1.severity_level matches request",
    createdReason1.severity_level,
    reasonCreateBody1.severity_level,
  );

  TestValidator.predicate(
    "createdReason1.description is null or undefined for minimal create",
    createdReason1.description === null ||
      createdReason1.description === undefined,
  );

  TestValidator.predicate(
    "createdReason1.deleted_at is null or undefined for new record",
    createdReason1.deleted_at === null ||
      createdReason1.deleted_at === undefined,
  );

  TestValidator.predicate(
    "createdReason1.created_at and updated_at are valid date-time strings",
    () => {
      const createdAt = new Date(createdReason1.created_at).getTime();
      const updatedAt = new Date(createdReason1.updated_at).getTime();
      return Number.isFinite(createdAt) && Number.isFinite(updatedAt);
    },
  );

  TestValidator.predicate(
    "createdReason1.created_at is earlier than or equal to updated_at",
    () => {
      const createdAt = new Date(createdReason1.created_at).getTime();
      const updatedAt = new Date(createdReason1.updated_at).getTime();
      return createdAt <= updatedAt;
    },
  );

  // 4. Create second catalog block reason with a different code to
  //    confirm multiple distinct creations succeed
  const reasonCreateBody2 = {
    code: `policy_violation_${RandomGenerator.alphaNumeric(12)}`,
    name: "Policy Violation - Secondary",
    severity_level: "medium",
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const createdReason2 =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      {
        body: reasonCreateBody2,
      },
    );
  typia.assert<IShoppingMallCatalogBlockReason>(createdReason2);

  TestValidator.equals(
    "createdReason2.code matches request",
    createdReason2.code,
    reasonCreateBody2.code,
  );
  TestValidator.equals(
    "createdReason2.name matches request",
    createdReason2.name,
    reasonCreateBody2.name,
  );
  TestValidator.equals(
    "createdReason2.severity_level matches request",
    createdReason2.severity_level,
    reasonCreateBody2.severity_level,
  );

  TestValidator.notEquals(
    "each created reason should have different id",
    createdReason1.id,
    createdReason2.id,
  );
}
