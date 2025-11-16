import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate the admin cart search endpoint for filtering and pagination.
 *
 * 1. Register a new admin and authenticate.
 * 2. Perform a default cart search (no filter), assert pagination and structure.
 * 3. Try searching with a customer_id filter (using a value observed in step 2),
 *    validate result is filtered.
 * 4. Use created_from and created_to to filter carts by creation date.
 * 5. Use updated_from and updated_to to filter carts by updated date.
 * 6. Use sort_by 'updated_at' and sort_order 'desc' to test sorting.
 * 7. Use pagination (page/limit) to check partial results/pages.
 * 8. Attempt access with an unauthenticated connection and expect access denied
 *    (error).
 */
export async function test_api_admin_cart_search_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new admin (authenticate)
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(adminAuth);

  // 2. Get all carts (unfiltered)
  const defaultResult: IPageIShoppingMallCart.ISummary =
    await api.functional.shoppingMall.admin.carts.index(connection, {
      body: {},
    });
  typia.assert(defaultResult);
  TestValidator.predicate(
    "response array is array",
    Array.isArray(defaultResult.data),
  );
  TestValidator.predicate(
    "pagination current >= 0",
    defaultResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    defaultResult.pagination.limit >= 0,
  );

  // 3. If there is at least one cart, try filter by customer_id
  if (defaultResult.data.length > 0) {
    const customerId = defaultResult.data[0].customer.id;
    const filteredByCustomer: IPageIShoppingMallCart.ISummary =
      await api.functional.shoppingMall.admin.carts.index(connection, {
        body: { customer_id: customerId },
      });
    typia.assert(filteredByCustomer);
    TestValidator.predicate(
      "all carts belong to given customer_id",
      filteredByCustomer.data.every((c) => c.customer.id === customerId),
    );
  }

  // 4. created_from / created_to
  if (defaultResult.data.length >= 2) {
    const allCarts = defaultResult.data;
    const firstCreated = allCarts[0].created_at;
    const lastCreated = allCarts[allCarts.length - 1].created_at;
    const filteredByDate: IPageIShoppingMallCart.ISummary =
      await api.functional.shoppingMall.admin.carts.index(connection, {
        body: { created_from: firstCreated, created_to: lastCreated },
      });
    typia.assert(filteredByDate);
    TestValidator.predicate(
      "all carts created within specified range",
      filteredByDate.data.every(
        (c) => c.created_at >= firstCreated && c.created_at <= lastCreated,
      ),
    );
  }

  // 5. updated_from / updated_to
  if (defaultResult.data.length >= 2) {
    const allCarts = defaultResult.data;
    const firstUpdated = allCarts[0].updated_at;
    const lastUpdated = allCarts[allCarts.length - 1].updated_at;
    const filteredByUpdated: IPageIShoppingMallCart.ISummary =
      await api.functional.shoppingMall.admin.carts.index(connection, {
        body: { updated_from: firstUpdated, updated_to: lastUpdated },
      });
    typia.assert(filteredByUpdated);
    TestValidator.predicate(
      "all carts updated within specified range",
      filteredByUpdated.data.every(
        (c) => c.updated_at >= firstUpdated && c.updated_at <= lastUpdated,
      ),
    );
  }

  // 6. Sort by updated_at desc
  const sorted: IPageIShoppingMallCart.ISummary =
    await api.functional.shoppingMall.admin.carts.index(connection, {
      body: { sort_by: "updated_at", sort_order: "desc" },
    });
  typia.assert(sorted);
  if (sorted.data.length > 1) {
    for (let i = 1; i < sorted.data.length; ++i) {
      TestValidator.predicate(
        `data[${i - 1}] updated_at >= data[${i}] updated_at`,
        sorted.data[i - 1].updated_at >= sorted.data[i].updated_at,
      );
    }
  }

  // 7. Pagination
  const page1: IPageIShoppingMallCart.ISummary =
    await api.functional.shoppingMall.admin.carts.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 1 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    });
  typia.assert(page1);
  TestValidator.predicate(
    "first page has at most 1 record",
    page1.data.length <= 1,
  );
  if (page1.pagination.pages > 1) {
    const page2: IPageIShoppingMallCart.ISummary =
      await api.functional.shoppingMall.admin.carts.index(connection, {
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 1 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      });
    typia.assert(page2);
    TestValidator.predicate(
      "second page has at most 1 record",
      page2.data.length <= 1,
    );
    if (page1.data.length > 0 && page2.data.length > 0) {
      TestValidator.notEquals(
        "page1 != page2",
        page1.data[0].id,
        page2.data[0].id,
      );
    }
  }

  // 8. Unauthenticated connection should be denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cart search should be forbidden",
    async () => {
      await api.functional.shoppingMall.admin.carts.index(unauthConn, {
        body: {},
      });
    },
  );
}
