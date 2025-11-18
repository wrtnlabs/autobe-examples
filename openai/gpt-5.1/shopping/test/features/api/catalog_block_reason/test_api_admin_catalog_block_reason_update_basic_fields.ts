import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

/**
 * Validate that an admin can update basic mutable fields of a catalog block
 * reason.
 *
 * Business context:
 *
 * - Catalog block reasons are governance metadata records used throughout the
 *   shopping mall to explain why catalog entities (products/SKUs) are blocked.
 * - Admins must be able to adjust human-readable fields such as `name` and
 *   `severity_level` without changing system-managed identifiers.
 *
 * This test performs the following workflow:
 *
 * 1. Register an admin using POST /auth/admin/join to obtain an authenticated
 *    context.
 * 2. Create a catalog block reason via POST
 *    /shoppingMall/admin/catalogBlockReasons.
 * 3. Update the created reason via PUT
 *    /shoppingMall/admin/catalogBlockReasons/{catalogBlockReasonId} changing
 *    only `name` and `severity_level` using
 *    IShoppingMallCatalogBlockReason.IUpdate.
 * 4. Validate that:
 *
 *    - `id` remains unchanged.
 *    - `name` and `severity_level` reflect the new values.
 *    - `code` and `description` remain unchanged.
 *    - `created_at` is unchanged while `updated_at` is strictly later than before.
 */
export async function test_api_admin_catalog_block_reason_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Register an admin (auth context for subsequent admin calls)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Keep ip undefined to allow backend defaults; href/referrer must be URIs
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create an initial catalog block reason
  const createBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 10,
    }),
    severity_level: RandomGenerator.pick(["low", "medium", "high"] as const),
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const created: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Capture original fields for later comparison
  const originalId = created.id;
  const originalCode = created.code;
  const originalDescription = created.description ?? null;
  const originalName = created.name;
  const originalSeverity = created.severity_level;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  // 3. Prepare update payload that changes only name and severity_level
  const updatedName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const updatedSeverity = RandomGenerator.pick([
    "low",
    "medium",
    "high",
  ] as const);

  const updateBody = {
    name: updatedName,
    severity_level: updatedSeverity,
    // code and description intentionally omitted to leave them unchanged
  } satisfies IShoppingMallCatalogBlockReason.IUpdate;

  const updated: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.update(
      connection,
      {
        catalogBlockReasonId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Business validations
  // id must remain unchanged
  TestValidator.equals(
    "catalog block reason id remains unchanged after update",
    updated.id,
    originalId,
  );

  // created_at must remain unchanged
  TestValidator.equals(
    "created_at remains unchanged after update",
    updated.created_at,
    originalCreatedAt,
  );

  // updated_at must be strictly later than before
  TestValidator.predicate(
    "updated_at is strictly later than original updated_at",
    new Date(updated.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );

  // name and severity_level must reflect new values
  TestValidator.equals(
    "name is updated to new value",
    updated.name,
    updatedName,
  );
  TestValidator.equals(
    "severity_level is updated to new value",
    updated.severity_level,
    updatedSeverity,
  );

  // code must remain unchanged
  TestValidator.equals(
    "code remains unchanged when not provided in update payload",
    updated.code,
    originalCode,
  );

  // description must remain unchanged (including nullability)
  TestValidator.equals(
    "description remains unchanged when not provided in update payload",
    updated.description ?? null,
    originalDescription,
  );

  // Also ensure that original name and severity_level actually changed
  TestValidator.notEquals(
    "name actually changed from original",
    updated.name,
    originalName,
  );
  TestValidator.notEquals(
    "severity_level actually changed from original",
    updated.severity_level,
    originalSeverity,
  );
}
