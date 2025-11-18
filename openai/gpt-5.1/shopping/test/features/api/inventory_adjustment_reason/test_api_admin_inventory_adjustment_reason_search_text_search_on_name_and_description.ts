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

export async function test_api_admin_inventory_adjustment_reason_search_text_search_on_name_and_description(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create inventory adjustment reasons with controlled names/descriptions
  // Reason A: name contains "warehouse"
  const reasonNameWarehouseBody = {
    code: "WAREHOUSE_NAME_TEST",
    name: "Damaged in warehouse", // name contains keyword
    description: "Items damaged during handling in the central warehouse.",
    direction: "decrease",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const reasonNameWarehouse: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: reasonNameWarehouseBody,
      },
    );
  typia.assert(reasonNameWarehouse);

  // Reason B: description contains "warehouse" but name does not
  const reasonDescWarehouseBody = {
    code: "WAREHOUSE_DESC_TEST",
    name: "Damaged in transit",
    description:
      "Received from upstream warehouse with visible damage reported.",
    direction: "decrease",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const reasonDescWarehouse: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: reasonDescWarehouseBody,
      },
    );
  typia.assert(reasonDescWarehouse);

  // Reason C: control reason without the word "warehouse" in name or description
  const reasonControlBody = {
    code: "CONTROL_NO_WAREHOUSE",
    name: "Cycle count adjustment",
    description: "Adjustment from regular cycle counting variance.",
    direction: "increase",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const reasonControl: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: reasonControlBody,
      },
    );
  typia.assert(reasonControl);

  // 3. Search with free-text term "warehouse"
  const searchTerm = "warehouse";
  const searchResponseByText: IPageIShoppingMallInventoryAdjustmentReason.ISummary =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.index(
      connection,
      {
        body: {
          search: searchTerm,
        } satisfies IShoppingMallInventoryAdjustmentReason.IRequest,
      },
    );
  typia.assert(searchResponseByText);

  const summariesByText = searchResponseByText.data;

  // 4. Assertions for name/description matches and exclusion of control reason
  TestValidator.predicate(
    "search by text should return reason whose name contains warehouse",
    summariesByText.some((summary) => summary.id === reasonNameWarehouse.id),
  );

  TestValidator.predicate(
    "search by text should return reason whose description contains warehouse",
    summariesByText.some((summary) => summary.id === reasonDescWarehouse.id),
  );

  TestValidator.predicate(
    "search by text should not return control reason without warehouse in name or description",
    summariesByText.every((summary) => summary.id !== reasonControl.id),
  );

  // 5. Optional: verify that searching by code can still find the control reason
  const searchResponseByCode: IPageIShoppingMallInventoryAdjustmentReason.ISummary =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.index(
      connection,
      {
        body: {
          search: reasonControl.code,
        } satisfies IShoppingMallInventoryAdjustmentReason.IRequest,
      },
    );
  typia.assert(searchResponseByCode);

  const summariesByCode = searchResponseByCode.data;

  TestValidator.predicate(
    "search by control code should include the control reason",
    summariesByCode.some((summary) => summary.id === reasonControl.id),
  );
}
