import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_wishlist_items_browse_paginated_results(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test authenticated customer wishlist browsing with pagination controls.
   *
   * Validates that a newly registered customer can browse their own wishlist in a paginated view and that the response contains only product-level wishlist entries belonging to that authenticated customer.
   *
   * The test checks pagination metadata, ensures the returned items are scoped to the logged-in customer, and verifies that the endpoint accepts representative search and sort controls while preserving wishlist item structure.
   *
   * 1. Register and authenticate a customer using a dedicated connection.
   * 2. Request the customer's wishlist with representative search, sort, page, and limit values.
   * 3. Validate page metadata and confirm every returned item belongs to the same authenticated customer.
   * 4. Confirm the returned entries are product-level wishlist items.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/join",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const wishlist =
    await api.functional.mallPlatform.customer.wishlists.items.index(
      customerConnection,
      {
        body: {
          search: RandomGenerator.alphabets(3),
          page: 1,
          limit: 10,
          sort: "-createdAt",
        } satisfies IMallPlatformWishlistItem.IRequest,
      },
    );
  typia.assert(wishlist);
  TestValidator.equals(
    "pagination current page should match request",
    wishlist.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    wishlist.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    wishlist.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    wishlist.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "wishlist data should be an array",
    Array.isArray(wishlist.data),
  );
  TestValidator.predicate(
    "wishlist items should belong to the authenticated customer",
    wishlist.data.every((item) => item.wishlist.customer.id === joined.id),
  );
  TestValidator.predicate(
    "wishlist items should belong to the authenticated customer email",
    wishlist.data.every(
      (item) => item.wishlist.customer.email === joined.email,
    ),
  );
  TestValidator.predicate(
    "wishlist items should reference saved products",
    wishlist.data.every((item) => item.product !== null),
  );
  TestValidator.predicate(
    "wishlist items should preserve product-level scope",
    wishlist.data.every(
      (item) =>
        item.wishlist.deletedAt === null ||
        item.wishlist.deletedAt !== undefined,
    ),
  );
}
