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

export async function test_api_system_settings_pagination_functionality(
  connection: api.IConnection,
): Promise<void> {
  // Test pagination functionality of system settings listing endpoint.
  // Note: IRequest is empty so no pagination parameters are sent.
  // 1. Create actor-specific connection (assumed admin for access)
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Call system settings index endpoint with empty body per IRequest schema
  const output = await api.functional.shoppingMall.systemSettings.index(
    adminConnection,
    { body: {} },
  );
  // 3. Assert entire response structure matches IPageIShoppingMallSystemSetting.ISummary
  typia.assert(output);
  // 4. Validate pagination metadata
  //    current page is positive integer (>= 1)
  TestValidator.predicate(
    "pagination current page is at least 1",
    output.pagination.current >= 1,
  );
  //    limit is positive integer
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  //    pages is zero or positive
  TestValidator.predicate(
    "pagination total pages is zero or positive",
    output.pagination.pages >= 0,
  );
  //    records is zero or positive and >= data length
  TestValidator.predicate(
    "pagination records is valid",
    output.pagination.records >= 0 &&
      output.pagination.records >= output.data.length,
  );
  // 5. Validate data array length is not more than pagination.limit
  TestValidator.predicate(
    "data length does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
}
