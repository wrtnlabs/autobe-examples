import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_wishlist } from "../prepare/prepare_random_mall_platform_wishlist";

/**
 * Generate the authenticated customer's wishlist container for E2E testing.
 *
 * Prepares wishlist creation input using the dedicated prepare function, then calls the API to create the authenticated customer's single wishlist container.
 *
 * This function is intended for test scenarios that need a real wishlist resource owned by the signed-in customer. The wishlist owner is resolved by the server from authentication context, so no owner identifier is accepted here.
 */
export async function generate_random_mall_platform_customer_wishlists_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformWishlist.ICreate> | undefined;
  },
): Promise<IMallPlatformWishlist> {
  const prepared: IMallPlatformWishlist.ICreate =
    prepare_random_mall_platform_wishlist(props.body);
  return await api.functional.mallPlatform.customer.wishlists.create(
    connection,
    {
      body: prepared,
    },
  );
}
