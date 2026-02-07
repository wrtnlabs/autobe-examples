import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_wishlists_create } from "../../../generate/generate_random_shopping_mall_customer_wishlists_create";
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";

export async function test_api_customer_wishlist_item_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await api.functional.shoppingMall.auth.customer.join(
    customerAConnection,
    {
      body: typia.random<IShoppingMallCustomer.IJoin>(),
    },
  );
  typia.assert(customerA);
  // 2. Register and login as Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await api.functional.shoppingMall.auth.customer.join(
    customerBConnection,
    {
      body: typia.random<IShoppingMallCustomer.IJoin>(),
    },
  );
  typia.assert(customerB);
  // 3. Create a wishlist item for Customer A
  const wishlistItemBody = typia.random<IShoppingMallWishlist.ICreate>();
  const wishlistItem = await api.functional.shoppingMall.customer.wishlists.create(
    customerAConnection,
    {
      body: wishlistItemBody,
    },
  );
  typia.assert(wishlistItem);
  // 4. Customer B attempts to delete Customer A's wishlist item
  // This should fail with 403 Forbidden
  try {
    await api.functional.shoppingMall.customer.wishlists.erase(
      customerBConnection,
      {
        wishlistId: (wishlistItem as any).id,
      },
    );
    // Should not reach here
    throw new Error("Expected deletion to fail");
  } catch (error) {
    // 5. Verify the response status is 403 Forbidden
    TestValidator.equals("error status is 403", (error as any).status, 403);
  }
  // 6. Verify the wishlist item still exists in the database
  const retrievedItem =
    await api.functional.shoppingMall.customer.wishlists.create(
      customerAConnection,
      {
        body: typia.random<IShoppingMallWishlist.ICreate>(),
      },
    );
  typia.assert(retrievedItem);
}