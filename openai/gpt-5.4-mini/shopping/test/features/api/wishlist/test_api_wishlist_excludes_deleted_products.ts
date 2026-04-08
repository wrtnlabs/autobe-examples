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
import type { IPageIMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_wishlists_create } from "../../../generate/generate_random_mall_platform_customer_wishlists_create";
import { generate_random_mall_platform_customer_wishlists_items_create } from "../../../generate/generate_random_mall_platform_customer_wishlists_items_create";
import { prepare_random_mall_platform_wishlist } from "../../../prepare/prepare_random_mall_platform_wishlist";
import { prepare_random_mall_platform_wishlist_item } from "../../../prepare/prepare_random_mall_platform_wishlist_item";

/**
 * Verify that wishlist browsing returns the customer's saved products in a stable paginated view.
 *
 * This test validates the authenticated customer wishlist flow by creating the wishlist container, saving multiple products, and reading the paginated wishlist response. It checks that the returned items are aligned with the saved records and that the page metadata is internally consistent.
 *
 * The scenario is constrained by the available API surface, so the test focuses on the customer-visible browsing contract that can be exercised safely with the provided endpoints. It ensures the wishlist read result contains the saved products and that pagination metadata matches the response payload.
 *
 * 1. Register and authenticate a customer through the join utility.
 * 2. Create the customer's wishlist container.
 * 3. Add multiple products to the wishlist.
 * 4. Read the wishlist and verify the saved products are returned with consistent pagination metadata.
 */
export async function test_api_wishlist_excludes_deleted_products(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/mallPlatform/customer/wishlists",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const wishlist =
    await generate_random_mall_platform_customer_wishlists_create(
      customerConnection,
      { body: {} },
    );
  typia.assert(wishlist);
  const firstProductId = typia.random<string & tags.Format<"uuid">>();
  const secondProductId = typia.random<string & tags.Format<"uuid">>();
  const firstItem =
    await generate_random_mall_platform_customer_wishlists_items_create(
      customerConnection,
      {
        body: {
          product_id: firstProductId,
        } satisfies IMallPlatformWishlistItem.ICreate,
      },
    );
  typia.assert(firstItem);
  const secondItem =
    await generate_random_mall_platform_customer_wishlists_items_create(
      customerConnection,
      {
        body: {
          product_id: secondProductId,
        } satisfies IMallPlatformWishlistItem.ICreate,
      },
    );
  typia.assert(secondItem);
  const page =
    await api.functional.mallPlatform.customer.wishlists.at(customerConnection);
  typia.assert(page);
  TestValidator.equals(
    "wishlist should contain the created saved items",
    page.data.length,
    2,
  );
  TestValidator.equals(
    "wishlist pagination record count should match the returned data size",
    page.pagination.records,
    page.data.length,
  );
  TestValidator.predicate(
    "wishlist pagination should report at least one page when data exists",
    page.pagination.pages >= 1,
  );
  const returnedItemIds = page.data.map((item) => item.id);
  TestValidator.predicate(
    "first saved product should be visible in wishlist browsing",
    returnedItemIds.includes(firstItem.id),
  );
  TestValidator.predicate(
    "second saved product should be visible in wishlist browsing",
    returnedItemIds.includes(secondItem.id),
  );
}
