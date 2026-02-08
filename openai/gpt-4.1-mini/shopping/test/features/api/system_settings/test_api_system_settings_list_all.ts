import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemSetting";
import type { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_settings_list_all(
  connection: api.IConnection,
) {
  // Test fetching all system settings without filters.
  // Verify that the response returns a paginated list of system settings,
  // that no soft-deleted records (deleted_at not null) are included,
  // and pagination metadata is correct.
  // Confirm that an empty list is handled gracefully if no settings exist.
  // Create actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Call the system settings index endpoint with empty body to list all
  const output = await api.functional.shoppingMall.systemSettings.index(
    adminConnection,
    {
      body: {},
    },
  );
  // Validate response type
  typia.assert(output);
  // Validate pagination
  TestValidator.predicate(
    "pagination current is non-negative integer",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative integer",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative integer",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative integer",
    output.pagination.pages >= 0,
  );
  // Validate data array and that no soft-deleted record is present
  TestValidator.predicate("data is array", Array.isArray(output.data));
  // Assuming that data items have no deleted_at property as per DTO
  // Just confirm no item has deleted_at defined (should be undefined always)
  for (const item of output.data) {
    TestValidator.predicate(
      "item deleted_at is null or undefined",
      !(
        "deleted_at" in item &&
        item.deleted_at !== undefined &&
        item.deleted_at !== null
      ),
    );
  }
}
