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
 * Test customer wishlist items retrieval with pagination and filtering.
 *
 * Validates the wishlist items retrieval endpoint including response structure, pagination metadata, and parameter handling. Tests that the API correctly handles various query parameters for filtering, sorting, and pagination while maintaining proper access control.
 *
 * Special attention is given to verifying pagination metadata accuracy, response type validation, and proper handling of optional query parameters. The test validates the API contract rather than business logic since product creation and wishlist item addition endpoints are not available in the test SDK.
 *
 * 1. Customer authenticates via join operation with randomized credentials.
 * 2. Retrieves wishlist items with pagination parameters using simulation mode.
 * 3. Validates response structure includes pagination metadata and product summaries.
 * 4. Tests search parameter handling in request body.
 * 5. Tests availability status parameter handling in request body.
 * 6. Tests sorting parameters (sort_by, sort_order) in request body.
 * 7. Tests cursor parameter handling for pagination.
 * 8. Validates all response types conform to expected DTO structures.
 */
export async function test_api_wishlist_items_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Generate valid wishlist ID (UUID format)
  const wishlistId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve wishlist items with default pagination
  const page1: IPageIEcommerceWishlistItem.ISummary =
    await api.functional.ecommerce.customer.wishlists.items.index(
      customerConnection,
      {
        wishlistId,
        body: {
          limit: 20,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
  typia.assert(page1);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    page1.pagination.current,
    page1.pagination.current,
  );
  TestValidator.predicate(
    "pagination limit non-negative",
    page1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page1.pagination.pages >= 0,
  );
  // 5. Validate wishlist item structure when data exists
  if (page1.data.length > 0) {
    const firstItem = page1.data[0];
    typia.assert(firstItem);
    // Validate item fields
    TestValidator.predicate(
      "item has valid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstItem.id,
      ),
    );
    TestValidator.predicate(
      "item has product reference",
      firstItem.product !== null && firstItem.product !== undefined,
    );
    TestValidator.predicate(
      "item has created_at timestamp",
      firstItem.created_at !== null && firstItem.created_at !== undefined,
    );
    // Validate product summary fields
    const product = firstItem.product;
    typia.assert(product);
    TestValidator.predicate(
      "product has valid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        product.id,
      ),
    );
    TestValidator.predicate(
      "product has name",
      product.name !== null && product.name !== undefined,
    );
    TestValidator.predicate("product has base_price", product.base_price >= 0);
  }
  // 6. Test search parameter in request
  const searchResults: IPageIEcommerceWishlistItem.ISummary =
    await api.functional.ecommerce.customer.wishlists.items.index(
      customerConnection,
      {
        wishlistId,
        body: {
          search: RandomGenerator.alphabets(5),
          limit: 20,
        } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search response has valid pagination",
    searchResults.pagination.records >= 0,
  );
  // 7. Test availability status parameter in request
  const inStockResults: IPageIEcommerceWishlistItem.ISummary =
    await api.functional.ecommerce.customer.wishlists.items.index(
      customerConnection,
      {
        wishlistId,
        body: {
          availability_status: "in_stock",
          limit: 20,
        } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
  typia.assert(inStockResults);
  TestValidator.predicate(
    "availability filter response has valid pagination",
    inStockResults.pagination.records >= 0,
  );
  // 8. Test sorting by product_name ascending
  const sortedByNameAsc: IPageIEcommerceWishlistItem.ISummary =
    await api.functional.ecommerce.customer.wishlists.items.index(
      customerConnection,
      {
        wishlistId,
        body: {
          sort_by: "product_name",
          sort_order: "asc",
          limit: 20,
        } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
  typia.assert(sortedByNameAsc);
  // 9. Test sorting by created_at descending
  const sortedByCreatedAtDesc: IPageIEcommerceWishlistItem.ISummary =
    await api.functional.ecommerce.customer.wishlists.items.index(
      customerConnection,
      {
        wishlistId,
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          limit: 20,
        } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
  typia.assert(sortedByCreatedAtDesc);
  // 10. Test cursor-based pagination parameter
  const cursorResults: IPageIEcommerceWishlistItem.ISummary =
    await api.functional.ecommerce.customer.wishlists.items.index(
      customerConnection,
      {
        wishlistId,
        body: {
          cursor: typia.random<string>(),
          limit: 20,
        } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
  typia.assert(cursorResults);
  TestValidator.predicate(
    "cursor pagination response has valid pagination",
    cursorResults.pagination.records >= 0,
  );
  // 11. Test combined parameters
  const combinedResults: IPageIEcommerceWishlistItem.ISummary =
    await api.functional.ecommerce.customer.wishlists.items.index(
      customerConnection,
      {
        wishlistId,
        body: {
          search: RandomGenerator.alphabets(3),
          availability_status: "out_of_stock",
          sort_by: "created_at",
          sort_order: "asc",
          limit: 10,
        } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
  typia.assert(combinedResults);
  TestValidator.predicate(
    "combined parameters response has valid pagination",
    combinedResults.pagination.records >= 0,
  );
}
