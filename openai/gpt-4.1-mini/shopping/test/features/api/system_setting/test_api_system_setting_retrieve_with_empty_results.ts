import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemSetting";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test retrieving system settings with filter criteria yielding empty results.
 * Administrator authenticates by joining first, then attempts to retrieve system settings
 * using a filter that should return no matching results. Validates that the data array
 * is empty and pagination metadata matches expected properties for empty sets.
 */
export async function test_api_system_setting_retrieve_with_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: `${RandomGenerator.alphabets(8)}@example.com`,
        password: "strongpassword",
      },
    });
  // Token injected internally in adminConnection.headers by utility function
  // Prepare request body with filter key that does not exist
  const requestBody: IShoppingMallSystemSetting.IRequest = {
    key: `non_existent_key_${RandomGenerator.alphabets(10)}`,
    dataType: null,
    description: null,
    page: 1,
    limit: 10,
  };
  // Call the index API to retrieve system settings by filter
  const response: IPageIShoppingMallSystemSetting.ISummary =
    await api.functional.shoppingMall.administrator.systemSettings.index(
      adminConnection,
      { body: requestBody },
    );
  // Validate response structure
  typia.assert(response);
  // Validate that data is empty array
  TestValidator.equals("data array should be empty", response.data.length, 0);
  // Validate pagination object fields and values for empty result
  TestValidator.predicate("pagination object has correct properties", () => {
    const p = response.pagination;
    return (
      typeof p.current === "number" &&
      p.current === 1 &&
      typeof p.limit === "number" &&
      p.limit === 10 &&
      typeof p.pages === "number" &&
      p.pages === 0 &&
      typeof p.records === "number" &&
      p.records === 0
    );
  });
}
