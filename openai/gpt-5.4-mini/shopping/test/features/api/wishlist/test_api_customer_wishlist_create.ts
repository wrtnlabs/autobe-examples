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

export async function test_api_customer_wishlist_create(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test customer wishlist creation enforces one wishlist per account.
   *
   * Validates that an authenticated customer can create a single wishlist container,
   * that the created wishlist is owned by the signed-in customer with no items yet,
   * and that all lifecycle fields are present. Also verifies duplicate creation is
   * rejected to preserve the one-wishlist-per-customer rule.
   *
   * 1. Register and authenticate a fresh customer account.
   * 2. Create the customer's wishlist container.
   * 3. Validate ownership, empty items, and lifecycle fields.
   * 4. Retry creation for the same customer and expect rejection.
   */
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "Test1234!",
      href: "https://example.com/signup",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorizedCustomer);
  const wishlist = await api.functional.mallPlatform.customer.wishlists.create(
    customerConnection,
    {
      body: {} satisfies IMallPlatformWishlist.ICreate,
    },
  );
  typia.assert(wishlist);
  TestValidator.equals(
    "wishlist owner should be the authenticated customer",
    wishlist.customer.email,
    customerEmail,
  );
  TestValidator.equals(
    "wishlist should start empty",
    wishlist.wishlistItems.length,
    0,
  );
  TestValidator.predicate("wishlist id should exist", wishlist.id.length > 0);
  TestValidator.predicate(
    "wishlist createdAt should be populated",
    wishlist.createdAt.length > 0,
  );
  TestValidator.predicate(
    "wishlist updatedAt should be populated",
    wishlist.updatedAt.length > 0,
  );
  TestValidator.equals(
    "wishlist should not be deleted",
    wishlist.deletedAt,
    null,
  );
  await TestValidator.error(
    "duplicate wishlist creation should fail",
    async () => {
      await api.functional.mallPlatform.customer.wishlists.create(
        customerConnection,
        {
          body: {} satisfies IMallPlatformWishlist.ICreate,
        },
      );
    },
  );
}
