import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerPasswordReset";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test filtering password reset requests by status and user type.
 *
 * Validates the password reset listing endpoint's filtering capabilities across multiple dimensions including status, user type, email search, and date range. Ensures that the API correctly filters and returns password reset records based on various criteria combinations.
 *
 * The test authenticates as a customer and then exercises the filtering functionality by testing individual filters and combined filter scenarios. It verifies that status filters (active, expired, used) correctly categorize tokens, user type filters isolate records by account type, email search performs partial matching, and date range filters limit results to specified time periods.
 *
 * 1. Authenticate as customer to access the password reset listing endpoint
 * 2. Test status='active' filter and verify only valid, unused, non-expired tokens are returned
 * 3. Test status='expired' filter and verify only past-expiration tokens are returned
 * 4. Test status='used' filter and verify only consumed tokens (deleted_at set) are returned
 * 5. Test user_type='customer' filter and verify only customer records are returned
 * 6. Test user_type='seller' filter and verify only seller records are returned
 * 7. Test user_type='administrator' filter and verify only administrator records are returned
 * 8. Test combined filter status='active' AND user_type='customer'
 * 9. Test email search filter with specific email address
 * 10. Test date_range filter with start and end dates
 */
export async function test_api_password_reset_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test status='active' filter
  const activeFilter =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          status: "active",
          pageSize: 100,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(activeFilter);
  TestValidator.predicate(
    "all active results have status active",
    activeFilter.data.every((item) => item.status === "active"),
  );
  // 3. Test status='expired' filter
  const expiredFilter =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          status: "expired",
          pageSize: 100,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(expiredFilter);
  TestValidator.predicate(
    "all expired results have status expired",
    expiredFilter.data.every((item) => item.status === "expired"),
  );
  // 4. Test status='used' filter
  const usedFilter =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          status: "used",
          pageSize: 100,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(usedFilter);
  TestValidator.predicate(
    "all used results have status used",
    usedFilter.data.every((item) => item.status === "used"),
  );
  // 5. Test user_type='customer' filter
  const customerTypeFilter =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          user_type: "customer",
          pageSize: 100,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(customerTypeFilter);
  TestValidator.predicate(
    "all customer type results are customer",
    customerTypeFilter.data.every((item) => item.user_type === "customer"),
  );
  // 6. Test user_type='seller' filter
  const sellerTypeFilter =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          user_type: "seller",
          pageSize: 100,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(sellerTypeFilter);
  TestValidator.predicate(
    "all seller type results are seller",
    sellerTypeFilter.data.every((item) => item.user_type === "seller"),
  );
  // 7. Test user_type='administrator' filter
  const adminTypeFilter =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          user_type: "administrator",
          pageSize: 100,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(adminTypeFilter);
  TestValidator.predicate(
    "all administrator type results are administrator",
    adminTypeFilter.data.every((item) => item.user_type === "administrator"),
  );
  // 8. Test combined filter: status='active' AND user_type='customer'
  const combinedFilter =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          status: "active",
          user_type: "customer",
          pageSize: 100,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter results are active customers",
    combinedFilter.data.every(
      (item) => item.status === "active" && item.user_type === "customer",
    ),
  );
  // 9. Test email search filter with registered customer email
  const emailFilter =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          email: customerAuth.email,
          pageSize: 100,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(emailFilter);
  TestValidator.predicate(
    "email filter results contain matching email",
    emailFilter.data.length === 0 ||
      emailFilter.data.every((item) =>
        item.user_email
          .toLowerCase()
          .includes(customerAuth.email.toLowerCase()),
      ),
  );
  // 10. Test date_range filter
  const now = new Date();
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const endDate = new Date();
  const dateRangeFilter =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          date_range: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          pageSize: 100,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
  TestValidator.predicate(
    "date range filter results are within range",
    dateRangeFilter.data.length === 0 ||
      dateRangeFilter.data.every((item) => {
        const createdAt = new Date(item.created_at);
        return createdAt >= startDate && createdAt <= endDate;
      }),
  );
}
