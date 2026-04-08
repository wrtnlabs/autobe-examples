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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_wishlists_create } from "../../../generate/generate_random_mall_platform_customer_wishlists_create";
import { prepare_random_mall_platform_wishlist } from "../../../prepare/prepare_random_mall_platform_wishlist";

export async function test_api_customer_wishlist_single_container_persistence(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies the customer wishlist container remains a single persistent record.
   *
   * The test covers the one-wishlist-per-customer invariant by registering a
   * customer, creating the wishlist container, and then repeating the same
   * creation call using the same authenticated account context. It confirms that
   * ownership remains attached to the same customer and that the server does not
   * create a second container for the same account.
   *
   * 1. Register and authenticate a customer in an isolated connection.
   * 2. Create the wishlist container for that customer.
   * 3. Call the wishlist creation endpoint again for the same customer account.
   * 4. Validate the second call returns the same wishlist container state rather
   *    than duplicating ownership or producing a distinct container.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const firstWishlist: IMallPlatformWishlist =
    await generate_random_mall_platform_customer_wishlists_create(
      customerConnection,
      {
        body: {} satisfies IMallPlatformWishlist.ICreate,
      },
    );
  typia.assert(firstWishlist);
  const secondWishlist: IMallPlatformWishlist =
    await generate_random_mall_platform_customer_wishlists_create(
      customerConnection,
      {
        body: {} satisfies IMallPlatformWishlist.ICreate,
      },
    );
  typia.assert(secondWishlist);
  TestValidator.equals(
    "wishlist id should remain stable for the same customer",
    firstWishlist.id,
    secondWishlist.id,
  );
  TestValidator.equals(
    "wishlist owner should remain the same customer",
    firstWishlist.customer.id,
    secondWishlist.customer.id,
  );
  TestValidator.equals(
    "wishlist owner email should remain unchanged",
    firstWishlist.customer.email,
    secondWishlist.customer.email,
  );
  TestValidator.equals(
    "wishlist should remain empty across repeated creation attempts",
    firstWishlist.wishlistItems.length,
    secondWishlist.wishlistItems.length,
  );
}
