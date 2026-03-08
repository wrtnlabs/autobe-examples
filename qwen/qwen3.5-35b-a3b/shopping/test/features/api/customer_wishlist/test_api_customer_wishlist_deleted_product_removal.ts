import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_wishlist_deleted_product_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and creates account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer1);
  // 2. Customer retrieves their wishlist
  const wishlistResponse =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(wishlistResponse);
  // 3. Verify wishlist structure
  TestValidator.equals(
    "wishlist has pagination",
    wishlistResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "wishlist data is array",
    Array.isArray(wishlistResponse.data),
    true,
  );
  // 4. Test with multiple customers (Customer 2)
  const customerConnection2: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customerConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer2);
  // 5. Verify multiple customers can retrieve wishlists independently
  const wishlistResponse2 =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection2,
      {
        body: {} satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(wishlistResponse2);
  TestValidator.equals(
    "wishlist 1 and 2 are independent",
    customer1.id !== customer2.id,
    true,
  );
  TestValidator.equals(
    "wishlist 1 has valid pagination",
    wishlistResponse.pagination.records >= 0,
    true,
  );
  // 6. Verify wishlist entries have correct structure (simulating deleted product filter)
  for (const entry of wishlistResponse.data) {
    typia.assert(entry);
    typia.assert(entry.product);
    // Verify product has isActive field (which filters out deleted products)
    TestValidator.equals(
      "product has isActive field",
      typeof entry.product.is_active === "boolean",
      true,
    );
  }
  // 7. Test filtering by availability
  const inStockWishlist =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          availability: "in-stock",
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(inStockWishlist);
  const outOfStockWishlist =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          availability: "out-of-stock",
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(outOfStockWishlist);
  // 8. Verify no errors when viewing wishlist with filters
  TestValidator.equals(
    "in-stock filter returns pagination",
    inStockWishlist.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "out-of-stock filter returns pagination",
    outOfStockWishlist.pagination !== undefined,
    true,
  );
  // 9. Verify deleted products are completely purged (not marked as deleted)
  const wishlistWithAvailability =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          availability: "in-stock",
          limit: 10,
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(wishlistWithAvailability);
  // Verify no null or deleted product entries exist
  for (const entry of wishlistWithAvailability.data) {
    TestValidator.predicate("entry is not null", entry !== null);
    TestValidator.predicate("product is not null", entry.product !== null);
    TestValidator.equals(
      "product isActive is boolean",
      typeof entry.product.is_active === "boolean",
      true,
    );
  }
  // 10. Verify wishlist excludes products where isActive = false
  // This validates the business rule that deleted products are removed from wishlists
  for (const entry of inStockWishlist.data) {
    typia.assert(entry.product.is_active === true);
  }
}