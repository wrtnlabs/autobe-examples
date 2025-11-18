import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryAdjustmentReason";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

export async function test_api_admin_inventory_adjustment_reason_get_by_reason_code_data_consistency_with_search(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new inventory adjustment reason
  const createBody = {
    code: `TEST_REASON_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    direction: RandomGenerator.pick([
      "increase",
      "decrease",
      "neutral",
    ] as const),
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const createdReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdReason);

  // Basic sanity checks on created entity
  TestValidator.equals(
    "created reason code equals request code",
    createdReason.code,
    createBody.code,
  );
  TestValidator.equals(
    "created reason name equals request name",
    createdReason.name,
    createBody.name,
  );
  TestValidator.equals(
    "created reason direction equals request direction",
    createdReason.direction,
    createBody.direction,
  );
  TestValidator.equals(
    "created reason is_system_managed equals request flag",
    createdReason.is_system_managed,
    createBody.is_system_managed,
  );

  // 3. Search for this reason using PATCH /shoppingMall/admin/inventoryAdjustmentReasons
  const searchBody = {
    page: 1,
    limit: 10,
    code: createdReason.code,
  } satisfies IShoppingMallInventoryAdjustmentReason.IRequest;

  const searchResult: IPageIShoppingMallInventoryAdjustmentReason.ISummary =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.index(
      connection,
      { body: searchBody },
    );
  typia.assert(searchResult);

  // Find the summary entry matching the created reason
  const summary = searchResult.data.find(
    (item) => item.id === createdReason.id && item.code === createdReason.code,
  );

  TestValidator.predicate(
    "summary entry for created reason must exist in search results",
    summary !== undefined,
  );

  if (!summary) return; // Defensive guard; predicate above will already fail test

  // 4. Retrieve the detail record via GET /shoppingMall/admin/inventoryAdjustmentReasons/{reasonCode}
  const detail: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.at(
      connection,
      { reasonCode: createdReason.code },
    );
  typia.assert(detail);

  // 5. Validate consistency between summary and detail
  TestValidator.equals("detail id matches summary id", detail.id, summary.id);
  TestValidator.equals(
    "detail code matches summary code",
    detail.code,
    summary.code,
  );
  TestValidator.equals(
    "detail name matches summary name",
    detail.name,
    summary.name,
  );

  // 6. Validate consistency between detail and original creation payload
  TestValidator.equals(
    "detail direction matches creation payload",
    detail.direction,
    createBody.direction,
  );
  TestValidator.equals(
    "detail is_system_managed matches creation payload",
    detail.is_system_managed,
    createBody.is_system_managed,
  );

  // 7. Additional logical checks on timestamps and soft-delete flag
  TestValidator.predicate(
    "detail created_at should be a non-empty string",
    detail.created_at.length > 0,
  );
  TestValidator.predicate(
    "detail updated_at should be a non-empty string",
    detail.updated_at.length > 0,
  );
  TestValidator.equals(
    "detail deleted_at should be null or undefined right after creation",
    detail.deleted_at ?? null,
    null,
  );
}
