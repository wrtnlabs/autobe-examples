import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
import { generate_random_ecommerce_mall_customer_wishlists_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlists_create";
import { prepare_random_ecommerce_mall_wishlist } from "../../../prepare/prepare_random_ecommerce_mall_wishlist";

export async function test_api_wishlist_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create wishlist entry
  const wishlistConnection: api.IConnection = { host: connection.host };
  const wishlist =
    await generate_random_ecommerce_mall_customer_wishlists_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(wishlist);
  // 3. Verify wishlist exists
  const wishlistListBefore =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: { limit: 100 } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(wishlistListBefore);
  TestValidator.equals(
    "wishlist list should contain created entry",
    wishlistListBefore.data.some((item) => item.id === wishlist.id),
    true,
  );
  // 4. Delete wishlist entry
  await api.functional.ecommerceMall.customer.wishlists.erase(
    customerConnection,
    {
      wishlistId: wishlist.id,
    },
  );
  // 5. Verify deletion - should return 204 No Content (void)
  // 6. Verify deleted entry no longer appears
  const wishlistListAfter =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: { limit: 100 } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(wishlistListAfter);
  TestValidator.equals(
    "wishlist list should not contain deleted entry",
    wishlistListAfter.data.some((item) => item.id === wishlist.id),
    false,
  );
  // 7. Re-add same product to wishlist
  const reAddedWishlist =
    await generate_random_ecommerce_mall_customer_wishlists_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(reAddedWishlist);
  // 8. Verify product appears again in wishlist list
  const finalWishlistList =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: { limit: 100 } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(finalWishlistList);
  TestValidator.equals(
    "wishlist list should contain re-added entry",
    finalWishlistList.data.some((item) => item.id === reAddedWishlist.id),
    true,
  );
}
