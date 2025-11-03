import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingCart";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCart";
import type { IShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCartItem";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";

/**
 * Validate admin cart index API for paginated retrieval and activity audit,
 * including authentication, filters, sort order, access control, and pagination
 * handling.
 *
 * 1. Register an admin and login to obtain admin context.
 * 2. List first page of carts with default query.
 * 3. For next pages, confirm pagination metadata and non-overlap of records.
 * 4. Pick a real customer cart from results and re-query with customer ID filter:
 *    must match only that cart/customer.
 * 5. Filter by created_from, created_to, updated_from, updated_to (using known
 *    cart timestamps), validating inclusion/exclusion of target cart.
 * 6. Test sort_by and sort_order (created_at asc/desc and updated_at asc/desc);
 *    records should be in correct order per page.
 * 7. Confirm cart summary DTO structure, that relationship information is limited
 *    (customer UUID and items/SKU summaries), and verify no sensitive customer
 *    info is present.
 * 8. Attempt access with unauthenticated context to confirm forbidden error.
 * 9. For large result sets, set limit low (e.g., 2) and iterate multiple pages,
 *    confirming page/limit/records/pages fields work and no duplicate carts
 *    returned between pages.
 */
export async function test_api_admin_cart_index_full_text_search_and_activity_audit(
  connection: api.IConnection,
) {
  // 1. Admin registration and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const role = RandomGenerator.pick([
    "operator",
    "support",
    "compliance",
    "super",
  ] as const);
  const status = RandomGenerator.pick([
    "active",
    "pending",
    "suspended",
    "locked",
  ] as const);
  const adminJoinResult: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: adminName,
        role,
        status,
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(adminJoinResult);

  // 2. Default paginated query for carts as admin
  const initialPage: IPageIShoppingCart.ISummary =
    await api.functional.shopping.admin.carts.index(connection, {
      body: { page: 1, limit: 5 } satisfies IShoppingCart.IRequest,
    });
  typia.assert(initialPage);
  TestValidator.predicate(
    "carts page has data or zero cart is allowed",
    Array.isArray(initialPage.data),
  );
  TestValidator.equals(
    "pagination info exists",
    typeof initialPage.pagination,
    "object",
  );
  TestValidator.equals("page per limit", initialPage.pagination.limit, 5);
  TestValidator.equals("current page", initialPage.pagination.current, 1);

  // 3. Page-by-page - test pagination mechanics
  if (initialPage.pagination.pages > 1) {
    const pages: IPageIShoppingCart.ISummary[] = [initialPage];
    for (let pg = 2; pg <= Math.min(initialPage.pagination.pages, 5); ++pg) {
      const pageN = await api.functional.shopping.admin.carts.index(
        connection,
        {
          body: { page: pg, limit: 5 } satisfies IShoppingCart.IRequest,
        },
      );
      typia.assert(pageN);
      TestValidator.equals("unique page", pageN.pagination.current, pg);
      pages.push(pageN);
      // All returned cart IDs must be unique across pages
      for (const prev of pages.slice(0, -1)) {
        for (const cart of pageN.data) {
          TestValidator.predicate(
            "no cart duplicated across pages",
            !prev.data.find((x) => x.id === cart.id),
          );
        }
      }
    }
  }

  // 4. Search by customer cart
  if (initialPage.data.length > 0) {
    const sampleCart = RandomGenerator.pick(initialPage.data);
    // Filter by shopping_customer_id
    const customerCartPage: IPageIShoppingCart.ISummary =
      await api.functional.shopping.admin.carts.index(connection, {
        body: {
          shopping_customer_id: sampleCart.shopping_customer_id,
          limit: 10,
        } satisfies IShoppingCart.IRequest,
      });
    typia.assert(customerCartPage);
    TestValidator.predicate(
      "all carts have target customer",
      customerCartPage.data.every(
        (x) => x.shopping_customer_id === sampleCart.shopping_customer_id,
      ),
    );

    // 5. Filter by created_from/created_to (inclusion/exclusion)
    const createdAt = sampleCart.created_at;
    const createdBefore = new Date(
      new Date(createdAt).getTime() - 24 * 60 * 60 * 1000,
    ).toISOString();
    const createdAfter = new Date(
      new Date(createdAt).getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
    const filterInclude: IPageIShoppingCart.ISummary =
      await api.functional.shopping.admin.carts.index(connection, {
        body: {
          created_from: createdBefore,
          created_to: createdAfter,
          shopping_customer_id: sampleCart.shopping_customer_id,
        } satisfies IShoppingCart.IRequest,
      });
    typia.assert(filterInclude);
    TestValidator.predicate(
      "filtered page includes sample cart",
      filterInclude.data.some((x) => x.id === sampleCart.id),
    );
    // Restrict to before createdAt (should *not* include sampleCart)
    const filterExclude: IPageIShoppingCart.ISummary =
      await api.functional.shopping.admin.carts.index(connection, {
        body: {
          created_to: createdBefore,
          shopping_customer_id: sampleCart.shopping_customer_id,
        } satisfies IShoppingCart.IRequest,
      });
    typia.assert(filterExclude);
    TestValidator.predicate(
      "filtered page does not include sample cart",
      !filterExclude.data.some((x) => x.id === sampleCart.id),
    );

    // 6. Filter by updated_from/updated_to (activity)
    const updatedAt = sampleCart.updated_at;
    const updatedBefore = new Date(
      new Date(updatedAt).getTime() - 24 * 60 * 60 * 1000,
    ).toISOString();
    const updatedAfter = new Date(
      new Date(updatedAt).getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
    const activityInclude: IPageIShoppingCart.ISummary =
      await api.functional.shopping.admin.carts.index(connection, {
        body: {
          updated_from: updatedBefore,
          updated_to: updatedAfter,
          shopping_customer_id: sampleCart.shopping_customer_id,
        } satisfies IShoppingCart.IRequest,
      });
    typia.assert(activityInclude);
    TestValidator.predicate(
      "activity filter includes sample cart",
      activityInclude.data.some((x) => x.id === sampleCart.id),
    );
    const activityExclude: IPageIShoppingCart.ISummary =
      await api.functional.shopping.admin.carts.index(connection, {
        body: {
          updated_to: updatedBefore,
          shopping_customer_id: sampleCart.shopping_customer_id,
        } satisfies IShoppingCart.IRequest,
      });
    typia.assert(activityExclude);
    TestValidator.predicate(
      "activity filter excludes sample cart",
      !activityExclude.data.some((x) => x.id === sampleCart.id),
    );
  }

  // 7. Sorting scenarios
  for (const sort_by of ["created_at", "updated_at"] as const) {
    for (const sort_order of ["asc", "desc"] as const) {
      const sortedPage = await api.functional.shopping.admin.carts.index(
        connection,
        {
          body: {
            sort_by,
            sort_order,
            limit: 10,
          } satisfies IShoppingCart.IRequest,
        },
      );
      typia.assert(sortedPage);
      if (sortedPage.data.length > 1) {
        for (let i = 1; i < sortedPage.data.length; ++i) {
          const prev = sortedPage.data[i - 1][sort_by];
          const curr = sortedPage.data[i][sort_by];
          if (sort_order === "asc") {
            TestValidator.predicate(
              `sorted ascending by ${sort_by}`,
              prev <= curr,
            );
          } else {
            TestValidator.predicate(
              `sorted descending by ${sort_by}`,
              prev >= curr,
            );
          }
        }
      }
    }
  }

  // 8. Validate DTO structure and permissions
  for (const cart of initialPage.data) {
    typia.assert<IShoppingCart.ISummary>(cart);
    TestValidator.equals(
      "cart exposes customer UUID (not expanded)",
      typeof cart.shopping_customer_id,
      "string",
    );
    TestValidator.predicate(
      "cart has item summaries array",
      Array.isArray(cart.items),
    );
    for (const item of cart.items) {
      typia.assert<IShoppingCartItem.ISummary>(item);
      typia.assert<IShoppingSku.ISummary>(item.sku);
      TestValidator.equals(
        "cart item exposes SKU",
        typeof item.sku.id,
        "string",
      );
    }
    // Ensure no forbidden properties leaked
    TestValidator.predicate(
      "cart does not expose customer email/name",
      Object.keys(cart).every(
        (key) =>
          key === "id" ||
          key === "shopping_customer_id" ||
          key === "created_at" ||
          key === "updated_at" ||
          key === "items",
      ),
    );
  }

  // 9. Unauthorized access scenario - create a connection with empty headers (no admin token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "admin carts index forbidden without auth",
    async () => {
      await api.functional.shopping.admin.carts.index(unauthConn, {
        body: { page: 1, limit: 2 } satisfies IShoppingCart.IRequest,
      });
    },
  );
}
