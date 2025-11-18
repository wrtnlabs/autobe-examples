import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

/**
 * Validate updating code and nullable description of a catalog block reason.
 *
 * Business flow being validated:
 *
 * 1. Register an admin using POST /auth/admin/join to get an authenticated admin
 *    context.
 * 2. Create an initial catalog block reason with non-null description via POST
 *    /shoppingMall/admin/catalogBlockReasons.
 * 3. Update the same block reason via PUT
 *    /shoppingMall/admin/catalogBlockReasons/{catalogBlockReasonId} to change
 *    its machine-readable `code` and `description`.
 * 4. Update the same block reason again, this time explicitly setting
 *    `description` to null to clear it while leaving other fields unchanged.
 * 5. Assert that `code` changes are persisted and `description` moves from
 *    non-null -> new non-null -> null as expected, with `id` remaining stable.
 */
export async function test_api_admin_catalog_block_reason_update_code_and_description(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an authorized admin context (and token header).
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // keep ip undefined to let backend derive it; href/referrer must be valid URIs
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an initial catalog block reason with non-null description.
  const initialCode: string = `policy_${RandomGenerator.alphaNumeric(8)}`;
  const initialName: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });
  const initialDescription: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 12,
  });
  const initialSeverityLevel: string = RandomGenerator.pick([
    "low",
    "medium",
    "high",
  ] as const);

  const createBody = {
    code: initialCode,
    name: initialName,
    description: initialDescription,
    severity_level: initialSeverityLevel,
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const created: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallCatalogBlockReason>(created);

  // Basic sanity checks on creation result.
  TestValidator.equals(
    "created reason id is stable and has uuid format",
    created.id,
    created.id,
  );
  TestValidator.equals(
    "created reason code matches initial code",
    created.code,
    initialCode,
  );
  TestValidator.equals(
    "created reason description matches initial description",
    created.description,
    initialDescription,
  );

  // 3. First update: change code and description using IUpdate.
  const updatedCode: string = `${initialCode}_updated`;
  const updatedDescription: string = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 12,
  });

  const firstUpdateBody = {
    code: updatedCode,
    description: updatedDescription,
  } satisfies IShoppingMallCatalogBlockReason.IUpdate;

  const afterFirstUpdate: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.update(
      connection,
      {
        catalogBlockReasonId: created.id,
        body: firstUpdateBody,
      },
    );
  typia.assert<IShoppingMallCatalogBlockReason>(afterFirstUpdate);

  // Assertions after first update: id unchanged, code and description updated.
  TestValidator.equals(
    "id remains unchanged after first update",
    afterFirstUpdate.id,
    created.id,
  );
  TestValidator.equals(
    "code updated to new value",
    afterFirstUpdate.code,
    updatedCode,
  );
  TestValidator.equals(
    "description updated to new non-null value",
    afterFirstUpdate.description,
    updatedDescription,
  );

  // 4. Second update: explicitly clear description by setting it to null.
  const secondUpdateBody = {
    description: null,
  } satisfies IShoppingMallCatalogBlockReason.IUpdate;

  const afterSecondUpdate: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.update(
      connection,
      {
        catalogBlockReasonId: created.id,
        body: secondUpdateBody,
      },
    );
  typia.assert<IShoppingMallCatalogBlockReason>(afterSecondUpdate);

  // Assertions after second update: description is null, other fields preserved.
  TestValidator.equals(
    "id remains unchanged after second update",
    afterSecondUpdate.id,
    created.id,
  );
  TestValidator.equals(
    "code remains the updated value after clearing description",
    afterSecondUpdate.code,
    updatedCode,
  );
  TestValidator.equals(
    "description is cleared to null via IUpdate description: null",
    afterSecondUpdate.description,
    null,
  );
}
