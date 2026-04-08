import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer wishlist view with pagination and filtering functionality.
 *
 * Validates the customer's wishlist retrieval endpoint with cursor-based pagination, availability status filtering, and product summary data integrity. Ensures pagination metadata is accurate and cursor-based pagination maintains consistent ordering without duplicates.
 *
 * The test authenticates a customer and retrieves their wishlist with various pagination parameters to verify the response structure and data consistency.
 *
 * 1. Authenticate customer using join endpoint.
 * 2. Retrieve wishlist with default pagination (limit 20).
 * 3. Validate pagination metadata (current, limit, records, pages).
 * 4. Validate each wishlist item contains complete product summary.
 * 5. Test filtering by availability_status.
 * 6. Test cursor-based pagination across multiple pages.
 * 7. Verify no duplicate items across pages.
 * 8. Verify correct ordering by created_at.
 */
export async function test_api_customer_wishlist_view_with_products_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Retrieve wishlist with default pagination
  const firstPage = await api.functional.ecommerce.customer.wishlist.index(
    customerConnection,
    {
      body: {
        limit: 20,
      } satisfies IEcommerceWishlistItem.IRequest,
    },
  );
  typia.assert(firstPage);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is non-negative",
    firstPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array length matches limit or is less",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  // 4. Validate each wishlist item contains complete product summary
  for (const item of firstPage.data) {
    typia.assert(item);
    // Validate product summary fields
    TestValidator.predicate(
      "product id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.product.id,
      ),
    );
    TestValidator.predicate(
      "product name is non-empty",
      item.product.name.length > 0,
    );
    TestValidator.predicate(
      "product base_price is non-negative",
      item.product.base_price >= 0,
    );
    TestValidator.predicate(
      "product seller shop_name is non-empty",
      item.product.seller.shop_name.length > 0,
    );
    TestValidator.predicate(
      "product category name is non-empty",
      item.product.category.name.length > 0,
    );
    TestValidator.predicate(
      "product stock_status is non-empty",
      item.product.stock_status.length > 0,
    );
    TestValidator.predicate(
      "product created_at is valid datetime",
      !isNaN(Date.parse(item.product.created_at)),
    );
    TestValidator.predicate(
      "product updated_at is valid datetime",
      !isNaN(Date.parse(item.product.updated_at)),
    );
    // Validate wishlist item timestamps
    TestValidator.predicate(
      "item created_at is valid datetime",
      !isNaN(Date.parse(item.created_at)),
    );
    TestValidator.predicate(
      "item updated_at is valid datetime",
      !isNaN(Date.parse(item.updated_at)),
    );
  }
  // 5. Test filtering by availability_status
  const filteredPage = await api.functional.ecommerce.customer.wishlist.index(
    customerConnection,
    {
      body: {
        availability_status: "in_stock",
        limit: 20,
      } satisfies IEcommerceWishlistItem.IRequest,
    },
  );
  typia.assert(filteredPage);
  // All filtered items should have in_stock status
  for (const item of filteredPage.data) {
    TestValidator.equals(
      "filtered item has in_stock status",
      item.product.stock_status,
      "in_stock",
    );
  }
  // 6. Test cursor-based pagination across multiple pages
  if (firstPage.data.length > 0) {
    const lastItem = firstPage.data[firstPage.data.length - 1];
    const cursor = Buffer.from(
      JSON.stringify({ created_at: lastItem.created_at, id: lastItem.id }),
    ).toString("base64");
    const secondPage = await api.functional.ecommerce.customer.wishlist.index(
      customerConnection,
      {
        body: {
          cursor,
          limit: 10,
        } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
    typia.assert(secondPage);
    // 7. Verify no duplicate items across pages
    const firstPageIds = new Set(firstPage.data.map((item) => item.id));
    for (const item of secondPage.data) {
      TestValidator.predicate(
        "no duplicate item id",
        !firstPageIds.has(item.id),
      );
    }
    // 8. Verify correct ordering by created_at (descending)
    if (firstPage.data.length > 1) {
      for (let i = 0; i < firstPage.data.length - 1; i++) {
        const current = new Date(firstPage.data[i].created_at).getTime();
        const next = new Date(firstPage.data[i + 1].created_at).getTime();
        TestValidator.predicate(
          "items ordered by created_at descending",
          current >= next,
        );
      }
    }
  }
}
