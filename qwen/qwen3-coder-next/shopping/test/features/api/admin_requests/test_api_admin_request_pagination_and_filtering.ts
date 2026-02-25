import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Login as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `superadmin+test@example.com`,
      password: "Test1234!@#$",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Get administrator requests list
  const response =
    await api.functional.shoppingMall.admin.admin.requests.index(
      adminConnection,
    );
  typia.assert(response);
  // 3. Validate response structure
  TestValidator.equals("pagination exists", response.pagination.current, 1);
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  TestValidator.equals(
    "data length matches pagination",
    response.data.length,
    response.pagination.records,
  );
  // 5. Validate individual request structure if any exist
  if (response.data.length > 0) {
    const firstRequest = response.data[0];
    typia.assert(firstRequest);
    TestValidator.equals("request has id", typeof firstRequest.id, "string");
    TestValidator.equals(
      "request has user",
      typeof firstRequest.user === "object",
      true,
    );
    TestValidator.equals(
      "request has status",
      ["pending", "approved", "rejected"].includes(firstRequest.status),
      true,
    );
  }
}
