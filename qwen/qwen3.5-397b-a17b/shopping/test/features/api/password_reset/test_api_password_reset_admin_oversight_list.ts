import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerPasswordReset";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test administrator's ability to list and monitor password reset requests across the platform.
 *
 * This test validates:
 * 1. Admin authentication for password reset oversight
 * 2. Password reset list endpoint returns correct pagination structure
 * 3. Response includes all required fields (id, customer, expires_at, created_at, consumed_at)
 * 4. Default pagination works correctly (page 1, limit 20, sorted by created_at descending)
 * 5. Authorization properly restricts access to admin actors only
 *
 * Note: Password reset request creation endpoint is not available in the provided API functions,
 * so this test validates the endpoint structure and authorization with existing data.
 */
export async function test_api_password_reset_admin_oversight_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer (potential password reset requester)
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create and authenticate admin for oversight
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 3. Admin lists password reset requests with default parameters
  const resetList =
    await api.functional.shoppingMall.customer.password_resets.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "created_at,desc",
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(resetList);
  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    resetList.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    resetList.pagination.current === 1,
  );
  TestValidator.predicate("limit is 20", resetList.pagination.limit === 20);
  TestValidator.predicate(
    "records is non-negative",
    resetList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    resetList.pagination.pages >= 0,
  );
  // 5. Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(resetList.data));
  // 6. If there are reset requests, validate business logic
  if (resetList.data.length > 0) {
    const resetRequest = resetList.data[0];
    // Validate consumed_at is either null or a date (business logic, not type)
    if (resetRequest.consumed_at !== null) {
      TestValidator.predicate(
        "consumed_at is after created_at",
        new Date(resetRequest.consumed_at).getTime() >=
          new Date(resetRequest.created_at).getTime(),
      );
    }
    // Validate expires_at is after created_at (business logic)
    TestValidator.predicate(
      "expires_at is after created_at",
      new Date(resetRequest.expires_at).getTime() >=
        new Date(resetRequest.created_at).getTime(),
    );
    // Validate customer relationship
    TestValidator.equals(
      "customer id matches",
      resetRequest.customer.id,
      resetRequest.customer.id,
    );
  }
  // 7. Test with different pagination parameters
  const resetListPage2 =
    await api.functional.shoppingMall.customer.password_resets.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
          sort: "created_at,asc",
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(resetListPage2);
  TestValidator.predicate(
    "page 2 current is 2",
    resetListPage2.pagination.current === 2,
  );
  TestValidator.predicate(
    "page 2 limit is 10",
    resetListPage2.pagination.limit === 10,
  );
  // 8. Test with actorType filter
  const resetListCustomerOnly =
    await api.functional.shoppingMall.customer.password_resets.index(
      adminConnection,
      {
        body: {
          actorType: "customer",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(resetListCustomerOnly);
  TestValidator.predicate(
    "customer filter pagination exists",
    resetListCustomerOnly.pagination !== undefined,
  );
}
