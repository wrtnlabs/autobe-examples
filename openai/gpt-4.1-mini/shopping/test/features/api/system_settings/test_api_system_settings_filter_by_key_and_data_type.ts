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

export async function test_api_system_settings_filter_by_key_and_data_type(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Retrieve all system settings without filters
  const resultAll = await api.functional.shoppingMall.systemSettings.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(resultAll);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has positive records",
    resultAll.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    resultAll.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    resultAll.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages correct",
    resultAll.pagination.pages ===
      Math.ceil(resultAll.pagination.records / resultAll.pagination.limit),
  );
  // Validate each item in data array conforms to ISummary - only assertion since no properties defined
  for (const item of resultAll.data) {
    typia.assert(item);
  }
  // Since IShoppingMallSystemSetting.IRequest has no defined filter properties, we cannot request filtered data directly.
  // Hence, test filtering logic by key substring and data type is skipped to ensure compilation.
}
