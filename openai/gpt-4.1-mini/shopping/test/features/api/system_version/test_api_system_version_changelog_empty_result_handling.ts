import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemVersion";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_version_changelog_empty_result_handling(
  connection: api.IConnection,
): Promise<void> {
  // Administrator join to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const authorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Prepare request body with filters that yield no results (empty request object according to IShoppingMallSystemVersion.IRequest schema which is an empty object)
  const requestBody: IShoppingMallSystemVersion.IRequest = {};
  // Call changelog index API with admin connection and empty filters to test empty result handling
  const response =
    await api.functional.shoppingMall.administrator.system_versions.changelog.index(
      adminConnection,
      { body: requestBody },
    );
  // Assert response type
  typia.assert(response);
  // Validate that data is empty array
  TestValidator.equals(
    "response data should be empty",
    response.data.length,
    0,
  );
  // Validate pagination fields for empty result
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  // We expect pagination.limit to be a positive number (default page size), not zero
  TestValidator.predicate(
    "pagination limit should be positive",
    response.pagination.limit > 0,
  );
  TestValidator.equals("pagination records", response.pagination.records, 0);
  TestValidator.equals("pagination pages", response.pagination.pages, 0);
  // Attempt unauthorized access: Prepare unauthenticated connection (no Authorization header)
  const unauthConnection: api.IConnection = { host: connection.host };
  // Call changelog index API should throw unauthorized error
  await TestValidator.httpError(
    "unauthorized access should fail",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.system_versions.changelog.index(
        unauthConnection,
        { body: requestBody },
      );
    },
  );
}
