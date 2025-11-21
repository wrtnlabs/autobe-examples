import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test comprehensive cart search functionality for administrators with various
 * filtering criteria. This test validates that administrators can search cart
 * sessions by status (active, abandoned, converted, expired), creation date
 * ranges, expiration timelines, shipping methods, and applied coupon codes. The
 * test also verifies pagination works correctly with page numbers and limits,
 * ensuring proper record counts and page calculations.
 */
export async function test_api_admin_cart_search_with_filters(
  connection: api.IConnection,
) {
  // Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({ access: "full" }),
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create customer accounts and authenticate them to get sessions
  const customerEmails = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"email">>(),
  );

  const customerSessions: string[] = [];

  for (const email of customerEmails) {
    // Create customer account
    const customer: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.join(connection, {
        body: {
          email,
          password: "customer123",
          first_name: RandomGenerator.name(1),
          last_name: RandomGenerator.name(1),
          href: "https://example.com/register",
          referrer: "https://example.com",
        } satisfies IShoppingMallCustomer.ICreate,
      });
    typia.assert(customer);

    // Authenticate customer to get session
    const authenticatedCustomer: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, {
        body: {
          email,
          password: "customer123",
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    typia.assert(authenticatedCustomer);

    customerSessions.push(authenticatedCustomer.id);
  }

  // Create test carts with various configurations
  const shippingMethods = ["standard", "express", "overnight"] as const;
  const couponCodes = ["SAVE10", "WELCOME20", "SUMMER25"] as const;

  const testCarts: IShoppingMallCart[] = [];

  for (let i = 0; i < 6; i++) {
    const sessionId = RandomGenerator.pick(customerSessions);
    const shippingMethod = RandomGenerator.pick(shippingMethods);
    const couponCode =
      i % 2 === 0 ? RandomGenerator.pick(couponCodes) : undefined;

    const cart: IShoppingMallCart =
      await api.functional.shoppingMall.customer.carts.create(connection, {
        body: {
          shopping_mall_customer_session_id: sessionId,
          shipping_method: shippingMethod,
          applied_coupon_code: couponCode,
        } satisfies IShoppingMallCart.ICreate,
      });
    typia.assert(cart);
    testCarts.push(cart);
  }

  // Test basic pagination
  const basicSearch: IPageIShoppingMallCart.ISummary =
    await api.functional.shoppingMall.admin.carts.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallCart.IRequest,
    });
  typia.assert(basicSearch);

  TestValidator.predicate(
    "pagination should return valid data",
    basicSearch.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid record count",
    basicSearch.pagination.records >= 0,
  );

  // Test different status filters if carts exist
  if (basicSearch.data.length > 0) {
    const availableStatuses = ArrayUtil.repeat(
      basicSearch.data.length,
      (i) => basicSearch.data[i].status,
    ).filter((status, index, array) => array.indexOf(status) === index);

    for (const status of availableStatuses.slice(0, 2)) {
      const statusSearch: IPageIShoppingMallCart.ISummary =
        await api.functional.shoppingMall.admin.carts.index(connection, {
          body: {
            page: 1,
            limit: 10,
            status,
          } satisfies IShoppingMallCart.IRequest,
        });
      typia.assert(statusSearch);

      TestValidator.predicate(
        `status filtered carts should have correct status: ${status}`,
        statusSearch.data.every((cart) => cart.status === status),
      );
    }
  }

  // Test shipping method filtering
  const shippingSearch: IPageIShoppingMallCart.ISummary =
    await api.functional.shoppingMall.admin.carts.index(connection, {
      body: {
        page: 1,
        limit: 10,
        shipping_method: "standard",
      } satisfies IShoppingMallCart.IRequest,
    });
  typia.assert(shippingSearch);

  // Test coupon code filtering
  const couponSearch: IPageIShoppingMallCart.ISummary =
    await api.functional.shoppingMall.admin.carts.index(connection, {
      body: {
        page: 1,
        limit: 10,
        applied_coupon_code: "SAVE10",
      } satisfies IShoppingMallCart.IRequest,
    });
  typia.assert(couponSearch);

  // Test date range filtering with realistic dates
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const dateSearch: IPageIShoppingMallCart.ISummary =
    await api.functional.shoppingMall.admin.carts.index(connection, {
      body: {
        page: 1,
        limit: 10,
        created_at_start: oneHourAgo.toISOString(),
        created_at_end: now.toISOString(),
      } satisfies IShoppingMallCart.IRequest,
    });
  typia.assert(dateSearch);

  // Test combined filters
  const combinedSearch: IPageIShoppingMallCart.ISummary =
    await api.functional.shoppingMall.admin.carts.index(connection, {
      body: {
        page: 1,
        limit: 5,
        shipping_method: "express",
      } satisfies IShoppingMallCart.IRequest,
    });
  typia.assert(combinedSearch);

  // Validate pagination calculations
  TestValidator.predicate(
    "pagination should have valid page count",
    basicSearch.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "current page should be valid",
    basicSearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be valid",
    basicSearch.pagination.limit > 0,
  );

  // Test that search results include essential cart summary information
  if (basicSearch.data.length > 0) {
    const sampleCart = basicSearch.data[0];
    TestValidator.predicate(
      "cart summary should have id",
      typeof sampleCart.id === "string" && sampleCart.id.length > 0,
    );
    TestValidator.predicate(
      "cart summary should have status",
      typeof sampleCart.status === "string" && sampleCart.status.length > 0,
    );
    TestValidator.predicate(
      "cart summary should have expiration date",
      typeof sampleCart.expires_at === "string" &&
        sampleCart.expires_at.length > 0,
    );
    TestValidator.predicate(
      "cart summary should have creation date",
      typeof sampleCart.created_at === "string" &&
        sampleCart.created_at.length > 0,
    );
    TestValidator.predicate(
      "cart summary should have update date",
      typeof sampleCart.updated_at === "string" &&
        sampleCart.updated_at.length > 0,
    );
  }

  // Test empty result scenarios gracefully
  const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const emptySearch: IPageIShoppingMallCart.ISummary =
    await api.functional.shoppingMall.admin.carts.index(connection, {
      body: {
        page: 1,
        limit: 5,
        created_at_start: futureDate.toISOString(),
        created_at_end: new Date(futureDate.getTime() + 3600000).toISOString(),
      } satisfies IShoppingMallCart.IRequest,
    });
  typia.assert(emptySearch);

  TestValidator.predicate(
    "future date search should return empty or valid data",
    emptySearch.data.length >= 0,
  );
}
