import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
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
import { generate_random_mall_platform_seller_products_variants_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_create";
import { prepare_random_mall_platform_cart_item } from "../../../prepare/prepare_random_mall_platform_cart_item";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";

export async function test_api_cart_reject_foreign_or_unavailable_variant_update(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const cart =
    await api.functional.mallPlatform.customer.carts.create(customerConnection);
  typia.assert(cart);
  const cartSnapshot = cart;
  const foreignConnection: api.IConnection = { host: connection.host };
  const foreignJoin = await authorize_customer_join(foreignConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(foreignJoin);
  await TestValidator.error(
    "foreign customer cannot update another cart",
    async () => {
      await api.functional.mallPlatform.customer.carts.update(
        foreignConnection,
        {
          cartId: cart.id,
          body: {
            cartItems: [
              {
                mall_platform_product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                quantity: 1,
              } satisfies IMallPlatformCartItem.ICreate,
            ],
          } satisfies IMallPlatformShoppingCart.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "unavailable variant update is rejected atomically",
    async () => {
      await api.functional.mallPlatform.customer.carts.update(
        customerConnection,
        {
          cartId: cart.id,
          body: {
            cartItems: [
              {
                mall_platform_product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                quantity: 1,
              } satisfies IMallPlatformCartItem.ICreate,
              {
                mall_platform_product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                quantity: 2,
              } satisfies IMallPlatformCartItem.ICreate,
            ],
          } satisfies IMallPlatformShoppingCart.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "cart object remains unchanged in test scope",
    cart,
    cartSnapshot,
  );
}
