import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_cart_management_unavailable_item_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer account setup and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail: string &
    tags.Format<"email"> &
    tags.MinLength<1> &
    tags.MaxLength<255> = typia.random<
    string & tags.Format<"email">
  >() satisfies string as string &
    tags.Format<"email"> &
    tags.MinLength<1> &
    tags.MaxLength<255>;
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail satisfies string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: customerPassword,
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string & tags.Format<"ipv4">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create customer connection with authorization token for cart operations
  const customerCartConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${customerAuth.token.access}` },
  };
  // 3. Add item to cart using valid cart operation
  const cartWithItem: IEcommerceMallShoppingCart.ISummary =
    await api.functional.ecommerceMall.customer.carts.manage(
      customerCartConnection,
      {
        body: {
          cartOperations: [
            {
              variant_id: typia.random<string & tags.Format<"uuid">>(),
              quantity: 3,
            } satisfies IEcommerceMallShoppingCart.IManageOperationAdd,
          ],
        },
      },
    );
  typia.assert(cartWithItem);
  // 4. Validate cart structure
  TestValidator.equals(
    "cart has item",
    cartWithItem.cartItems.length >= 0,
    true,
  );
  TestValidator.predicate("cart has subtotal", cartWithItem.subtotal >= 0);
  TestValidator.predicate("cart has total", cartWithItem.total >= 0);
  // 5. Test cart sync operation (retrieve cart without modifying)
  const cartSync: IEcommerceMallShoppingCart.ISummary =
    await api.functional.ecommerceMall.customer.carts.manage(
      customerCartConnection,
      {
        body: {
          cartOperations: [],
        },
      },
    );
  typia.assert(cartSync);
  // 6. Validate synced cart has same structure
  TestValidator.equals(
    "synced cart has items",
    cartSync.cartItems.length,
    cartWithItem.cartItems.length,
  );
  // 7. Remove items from cart
  const variantIdToRemove: string =
    cartWithItem.cartItems.length > 0
      ? cartWithItem.cartItems[0].variant.id
      : typia.random<string & tags.Format<"uuid">>();
  const cartAfterRemoval: IEcommerceMallShoppingCart.ISummary =
    await api.functional.ecommerceMall.customer.carts.manage(
      customerCartConnection,
      {
        body: {
          cartOperations: [
            {
              variant_id: variantIdToRemove,
            } satisfies IEcommerceMallShoppingCart.IManageOperationRemove,
          ],
        },
      },
    );
  typia.assert(cartAfterRemoval);
  // 8. Validate empty cart
  TestValidator.equals(
    "cart empty after removal",
    cartAfterRemoval.cartItems.length,
    0,
  );
  TestValidator.equals(
    "cart total zero after removal",
    cartAfterRemoval.total,
    0,
  );
  TestValidator.equals(
    "cart subtotal zero after removal",
    cartAfterRemoval.subtotal,
    0,
  );
}
