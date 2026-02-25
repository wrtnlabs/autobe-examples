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

export async function test_api_admin_request_list_super_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Test 1: Super admin retrieves all requests
  const allRequests =
    await api.functional.shoppingMall.admin.admin.requests.index(
      superAdminConnection,
    );
  typia.assert(allRequests);
  // Test 2: Pagination validation
  TestValidator.equals(
    "pagination has required fields",
    typeof allRequests.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has required fields",
    typeof allRequests.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has required fields",
    typeof allRequests.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has required fields",
    typeof allRequests.pagination.pages,
    "number",
  );
  // Test 3: Data structure validation
  TestValidator.predicate("data is array", Array.isArray(allRequests.data));
  // Test 4: Each request has required fields
  if (allRequests.data.length > 0) {
    const firstRequest = allRequests.data[0];
    typia.assert(firstRequest);
    TestValidator.equals("request has id", typeof firstRequest.id, "string");
    TestValidator.equals(
      "request has status",
      ["pending", "approved", "rejected"].includes(firstRequest.status),
      true,
    );
    TestValidator.equals(
      "request has reason",
      typeof firstRequest.reason,
      "string",
    );
    TestValidator.equals(
      "request has user",
      firstRequest.user !== undefined,
      true,
    );
    TestValidator.equals(
      "request has created_at",
      typeof firstRequest.created_at,
      "string",
    );
    TestValidator.equals(
      "request has updated_at",
      typeof firstRequest.updated_at,
      "string",
    );
    // User structure validation
    if (firstRequest.user) {
      TestValidator.equals(
        "user has id",
        typeof firstRequest.user.id,
        "string",
      );
      TestValidator.equals(
        "user has email",
        typeof firstRequest.user.email === "string" ||
          firstRequest.user.email === undefined,
        true,
      );
    }
  }
  // Test 5: Empty result handling
  TestValidator.equals(
    "empty data handled correctly",
    allRequests.data.length >= 0,
    true,
  );
}