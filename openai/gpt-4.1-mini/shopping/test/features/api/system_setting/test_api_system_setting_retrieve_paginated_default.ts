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

export async function test_api_system_setting_retrieve_paginated_default(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving paginated system configuration settings with no filters. Administrator authenticates with join, then requests first page with default pagination and verifies response contains correct summary fields with expected types and pagination info.
  // 1. Administrator join to authenticate and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass1234",
    },
  });
  // Set Authorization header on a new connection for admin
  const authorizedAdminConnection: api.IConnection = { host: connection.host };
  authorizedAdminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 2. Send PATCH request to retrieve system settings with default pagination
  const requestBody: IShoppingMallSystemSetting.IRequest = {
    key: null,
    dataType: null,
    description: null,
    page: 1,
    limit: 10,
  };
  const paginatedSettings =
    await api.functional.shoppingMall.administrator.systemSettings.index(
      authorizedAdminConnection,
      { body: requestBody },
    );
  // Assert the response structure and types
  typia.assert(paginatedSettings);
  // Validate pagination information
  TestValidator.predicate(
    "Pagination current page must be 1",
    paginatedSettings.pagination.current === 1,
  );
  TestValidator.predicate(
    "Pagination limit must be 10",
    paginatedSettings.pagination.limit === 10,
  );
  TestValidator.predicate(
    "Pagination pages must be >= 0",
    paginatedSettings.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "Pagination records must be >= 0",
    paginatedSettings.pagination.records >= 0,
  );
  // Validate each setting entry fields
  for (const setting of paginatedSettings.data) {
    typia.assert(setting);
    TestValidator.predicate(
      "ID is UUID format",
      /^[0-9a-fA-F-]{36}$/.test(setting.id),
    );
    TestValidator.predicate(
      "Key is non-empty string",
      typeof setting.key === "string" && setting.key.length > 0,
    );
    TestValidator.predicate(
      "Value is string",
      typeof setting.value === "string",
    );
    // description can be null or string
    TestValidator.predicate(
      "Description is null or string",
      setting.description === null || typeof setting.description === "string",
    );
    TestValidator.predicate(
      "DataType is non-empty string",
      typeof setting.dataType === "string" && setting.dataType.length > 0,
    );
  }
}
