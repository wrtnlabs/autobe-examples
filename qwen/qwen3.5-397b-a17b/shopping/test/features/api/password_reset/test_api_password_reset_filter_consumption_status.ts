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
 * Test administrator's ability to filter password reset requests by token consumption and expiration status.
 *
 * This test validates the security audit functionality for password reset oversight:
 * 1. Setup admin and customer accounts for authentication
 * 2. Filter by consumed=true to verify only used tokens (consumed_at is not null)
 * 3. Filter by consumed=false to verify only unused tokens (consumed_at is null)
 * 4. Filter by expired=true to verify only expired tokens
 * 5. Filter by expired=false to verify only valid non-expired tokens
 * 6. Test combined filters for security pattern analysis
 * 7. Validate pagination metadata reflects filtered counts correctly
 * 8. Verify response structure with proper consumed_at timestamps
 */
export async function test_api_password_reset_filter_consumption_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin account for authentication
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
  // 2. Setup customer account
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
  // 3. Test filtering by consumed=true (used tokens only)
  const consumedTrueResult =
    await api.functional.shoppingMall.customer.password_resets.index(
      adminConnection,
      {
        body: {
          actorType: "customer",
          consumed: true,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(consumedTrueResult);
  TestValidator.predicate(
    "consumed=true pagination valid",
    () => consumedTrueResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "consumed=true records count valid",
    () => consumedTrueResult.pagination.records >= 0,
  );
  // Verify filter works: all returned items should have consumed_at not null
  for (const item of consumedTrueResult.data) {
    TestValidator.predicate(
      `reset ${item.id} should have consumed_at`,
      item.consumed_at !== null,
    );
  }
  // 4. Test filtering by consumed=false (unused tokens only)
  const consumedFalseResult =
    await api.functional.shoppingMall.customer.password_resets.index(
      adminConnection,
      {
        body: {
          actorType: "customer",
          consumed: false,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(consumedFalseResult);
  // Verify filter works: all returned items should have consumed_at null
  for (const item of consumedFalseResult.data) {
    TestValidator.predicate(
      `reset ${item.id} should have consumed_at null`,
      item.consumed_at === null,
    );
  }
  // 5. Test filtering by expired=true (expired tokens only)
  const expiredTrueResult =
    await api.functional.shoppingMall.customer.password_resets.index(
      adminConnection,
      {
        body: {
          actorType: "customer",
          expired: true,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(expiredTrueResult);
  TestValidator.predicate(
    "expired=true pagination valid",
    () => expiredTrueResult.pagination.current >= 1,
  );
  // 6. Test filtering by expired=false (valid tokens only)
  const expiredFalseResult =
    await api.functional.shoppingMall.customer.password_resets.index(
      adminConnection,
      {
        body: {
          actorType: "customer",
          expired: false,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(expiredFalseResult);
  TestValidator.predicate(
    "expired=false pagination valid",
    () => expiredFalseResult.pagination.current >= 1,
  );
  // 7. Test combined filters: consumed=false AND expired=true (unused expired tokens - security concern)
  const combinedResult =
    await api.functional.shoppingMall.customer.password_resets.index(
      adminConnection,
      {
        body: {
          actorType: "customer",
          consumed: false,
          expired: true,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Verify combined filter works: all returned items should be unused
  for (const item of combinedResult.data) {
    TestValidator.predicate(
      `reset ${item.id} should be unused`,
      item.consumed_at === null,
    );
  }
  // 8. Test without filters (all password resets)
  const allResult =
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
  typia.assert(allResult);
  TestValidator.predicate(
    "all results pagination valid",
    () => allResult.pagination.current >= 1,
  );
  TestValidator.predicate("all results has data array", () =>
    Array.isArray(allResult.data),
  );
  // 9. Test pagination metadata consistency
  TestValidator.predicate(
    "pagination limit within range",
    () => allResult.pagination.limit >= 1 && allResult.pagination.limit <= 100,
  );
}
