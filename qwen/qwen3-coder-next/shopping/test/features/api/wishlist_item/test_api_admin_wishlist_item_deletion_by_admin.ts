import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_wishlists_create } from "../../../generate/generate_random_shopping_mall_customer_wishlists_create";
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";

export async function test_api_admin_wishlist_item_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `admin${typia.random<string & tags.Format<"uuid">>()}@test.com`,
      password: "1234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create customer connection and login
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: `customer${typia.random<string & tags.Format<"uuid">>()}@test.com`,
      password: "1234",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Customer adds an item to their wishlist
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlists.create(
      customerConnection,
      {
        body: typia.random<IShoppingMallWishlist.ICreate>(),
      },
    );
  typia.assert(wishlistItem);
  // 4. Admin deletes the customer's wishlist item
  await api.functional.shoppingMall.customer.wishlists.erase(adminConnection, {
    wishlistId: typia.assert<string>(wishlistItem as any),
  });
  // 5. Verify deletion - admin can delete any customer's wishlist item
  // Attempting to delete the same item again should result in an error
  await TestValidator.error("wishlist item already deleted", async () => {
    await api.functional.shoppingMall.customer.wishlists.erase(
      adminConnection,
      {
        wishlistId: typia.assert<string>(wishlistItem as any),
      },
    );
  });
}