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

export async function test_api_system_setting_retrieve_filtered_by_key_and_data_type(
  connection: api.IConnection,
): Promise<void> {
  // Administrator authentication by join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: "strongpassword",
    },
  });
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // Prepare request: key substring and dataType filter
  // Use deterministic key substring to try to match
  const keySubstring = "config"; // common substring in keys
  const dataTypeFilter = "string";
  const requestBody: IShoppingMallSystemSetting.IRequest = {
    key: keySubstring,
    dataType: dataTypeFilter,
    page: 1,
    limit: 10,
  };
  // Call the system setting list retrieval API
  const response =
    await api.functional.shoppingMall.administrator.systemSettings.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // Validate pagination properties
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page greater or equal to 1",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit between 1 and 100",
    pagination.limit >= 1 && pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination total records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  // Check each data item to confirm filter conditions
  response.data.forEach((setting) => {
    TestValidator.predicate(
      `key contains substring '${keySubstring}'`,
      setting.key.includes(keySubstring),
    );
    TestValidator.equals(
      `dataType matches '${dataTypeFilter}'`,
      setting.dataType,
      dataTypeFilter,
    );
  });
  // Check no irrelevant items by validating that all items satisfy filters
  const filteredItems = response.data.filter(
    (item) =>
      item.key.includes(keySubstring) && item.dataType === dataTypeFilter,
  );
  TestValidator.equals(
    "all items filtered correctly",
    filteredItems.length,
    response.data.length,
  );
}
