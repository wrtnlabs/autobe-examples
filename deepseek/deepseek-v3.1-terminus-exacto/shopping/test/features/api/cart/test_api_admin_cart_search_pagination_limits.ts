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
 * Test cart search pagination functionality with various limit configurations.
 * Validate that administrators can control result set sizes using limit
 * parameters and navigate through multiple pages using page numbers. Verify
 * pagination metadata includes accurate record counts, page calculations, and
 * proper handling of edge cases like last pages and empty result sets. Test
 * that large datasets are efficiently paginated while maintaining system
 * performance.
 */
export async function test_api_admin_cart_search_pagination_limits(
  connection: api.IConnection,
) {
  // Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "support_admin",
        permissions: JSON.stringify({ access: "read" }),
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create multiple customer accounts
  const customers: IShoppingMallCustomer.IAuthorized[] =
    await ArrayUtil.asyncRepeat(15, async (index) => {
      const customerEmail = typia.random<string & tags.Format<"email">>();
      const customer: IShoppingMallCustomer.IAuthorized =
        await api.functional.auth.customer.join(connection, {
          body: {
            email: customerEmail,
            password: "CustomerPassword123!",
            first_name: RandomGenerator.name(),
            last_name: RandomGenerator.name(),
            phone_number: RandomGenerator.mobile(),
            href: "https://example.com/register",
            referrer: "https://example.com",
          } satisfies IShoppingMallCustomer.ICreate,
        });
      typia.assert(customer);
      return customer;
    });

  // Create multiple shopping carts for each customer
  const allCarts: IShoppingMallCart[] = [];

  for (const customer of customers) {
    // Switch to customer account
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customer.email,
        password: "CustomerPassword123!",
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ILogin,
    });

    // Create 2-4 carts per customer
    const customerCartCount = typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
    >();
    const customerCarts = await ArrayUtil.asyncRepeat(
      customerCartCount,
      async () => {
        const cart: IShoppingMallCart =
          await api.functional.shoppingMall.customer.carts.create(connection, {
            body: {
              shopping_mall_customer_session_id: customer.id,
              shipping_method: RandomGenerator.pick([
                "standard",
                "express",
                "overnight",
              ] as const),
              applied_coupon_code: typia.random<string & tags.Format<"uuid">>(),
            } satisfies IShoppingMallCart.ICreate,
          });
        typia.assert(cart);
        return cart;
      },
    );

    allCarts.push(...customerCarts);
  }

  // Switch back to admin account
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Test pagination with various limit configurations
  const limitConfigurations = [1, 5, 10, 25, 50, 100] as const;

  for (const limit of limitConfigurations) {
    // Test first page
    const firstPage: IPageIShoppingMallCart.ISummary =
      await api.functional.shoppingMall.admin.carts.index(connection, {
        body: {
          page: 1,
          limit: limit satisfies number as number,
        } satisfies IShoppingMallCart.IRequest,
      });
    typia.assert(firstPage);

    // Validate pagination metadata
    TestValidator.equals(
      `limit ${limit} - pagination metadata should be accurate`,
      firstPage.pagination.limit,
      Math.min(limit, 100),
    );
    TestValidator.predicate(
      `limit ${limit} - current page should be 1`,
      firstPage.pagination.current === 1,
    );
    TestValidator.predicate(
      `limit ${limit} - total records should match created carts`,
      firstPage.pagination.records >= allCarts.length,
    );
    TestValidator.predicate(
      `limit ${limit} - page count calculation should be correct`,
      firstPage.pagination.pages ===
        Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
    );

    // Test data consistency
    TestValidator.predicate(
      `limit ${limit} - data length should not exceed limit`,
      firstPage.data.length <= firstPage.pagination.limit,
    );

    // Test subsequent pages if they exist
    if (firstPage.pagination.pages > 1) {
      const secondPage: IPageIShoppingMallCart.ISummary =
        await api.functional.shoppingMall.admin.carts.index(connection, {
          body: {
            page: 2,
            limit: limit satisfies number as number,
          } satisfies IShoppingMallCart.IRequest,
        });
      typia.assert(secondPage);

      TestValidator.equals(
        `limit ${limit} - second page should have correct page number`,
        secondPage.pagination.current,
        2,
      );

      // Ensure no overlap between pages
      const firstPageIds = new Set(firstPage.data.map((cart) => cart.id));
      const secondPageIds = new Set(secondPage.data.map((cart) => cart.id));

      TestValidator.predicate(
        `limit ${limit} - pages should have distinct cart IDs`,
        Array.from(firstPageIds).every((id) => !secondPageIds.has(id)),
      );
    }

    // Test last page
    const lastPage: IPageIShoppingMallCart.ISummary =
      await api.functional.shoppingMall.admin.carts.index(connection, {
        body: {
          page: firstPage.pagination.pages,
          limit: limit satisfies number as number,
        } satisfies IShoppingMallCart.IRequest,
      });
    typia.assert(lastPage);

    TestValidator.equals(
      `limit ${limit} - last page should have correct page number`,
      lastPage.pagination.current,
      firstPage.pagination.pages,
    );

    // Test beyond last page (should return empty or last page)
    const beyondLastPage: IPageIShoppingMallCart.ISummary =
      await api.functional.shoppingMall.admin.carts.index(connection, {
        body: {
          page: firstPage.pagination.pages + 1,
          limit: limit satisfies number as number,
        } satisfies IShoppingMallCart.IRequest,
      });
    typia.assert(beyondLastPage);

    // The API should handle beyond-last-page gracefully
    TestValidator.predicate(
      `limit ${limit} - page beyond last should be handled properly`,
      beyondLastPage.pagination.current >= 1 &&
        beyondLastPage.pagination.current <= beyondLastPage.pagination.pages,
    );
  }

  // Test edge case: empty result set with specific filters
  const emptyFilterResult: IPageIShoppingMallCart.ISummary =
    await api.functional.shoppingMall.admin.carts.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "nonexistent_status",
      } satisfies IShoppingMallCart.IRequest,
    });
  typia.assert(emptyFilterResult);

  TestValidator.equals(
    "empty filter result should have zero data records",
    emptyFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty filter result should have zero total records",
    emptyFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filter result should have one page",
    emptyFilterResult.pagination.pages,
    1,
  );

  // Test minimum limit value
  const minLimitResult: IPageIShoppingMallCart.ISummary =
    await api.functional.shoppingMall.admin.carts.index(connection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallCart.IRequest,
    });
  typia.assert(minLimitResult);

  TestValidator.equals(
    "minimum limit should return exactly one item",
    minLimitResult.data.length,
    1,
  );

  // Test maximum limit value
  const maxLimitResult: IPageIShoppingMallCart.ISummary =
    await api.functional.shoppingMall.admin.carts.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallCart.IRequest,
    });
  typia.assert(maxLimitResult);

  TestValidator.predicate(
    "maximum limit should return up to 100 items",
    maxLimitResult.data.length <= 100,
  );

  // Test pagination consistency across different pages
  const consistencyLimit = 5;
  const page1: IPageIShoppingMallCart.ISummary =
    await api.functional.shoppingMall.admin.carts.index(connection, {
      body: {
        page: 1,
        limit: consistencyLimit,
      } satisfies IShoppingMallCart.IRequest,
    });
  typia.assert(page1);

  if (page1.pagination.pages > 1) {
    const page2: IPageIShoppingMallCart.ISummary =
      await api.functional.shoppingMall.admin.carts.index(connection, {
        body: {
          page: 2,
          limit: consistencyLimit,
        } satisfies IShoppingMallCart.IRequest,
      });
    typia.assert(page2);

    // Verify consistent limit across pages
    TestValidator.equals(
      "consistent limit should be maintained across pages",
      page1.pagination.limit,
      page2.pagination.limit,
    );

    // Verify total record count consistency
    TestValidator.equals(
      "total records should be consistent across pages",
      page1.pagination.records,
      page2.pagination.records,
    );
  }
}
