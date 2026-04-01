import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_carts_items_post } from "../../../generate/generate_random_mall_platform_customer_carts_items_post";
import { prepare_random_mall_platform_cart_item } from "../../../prepare/prepare_random_mall_platform_cart_item";

export async function test_api_cart_item_quantity_update(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const cart =
    await api.functional.mallPlatform.customer.carts.create(customerConnection);
  typia.assert(cart);
  const createdItem =
    await api.functional.mallPlatform.customer.carts.items.post(
      customerConnection,
      {
        body: {
          mall_platform_product_variant_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: 1,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(createdItem);
  const updatedQuantity = createdItem.quantity + 1;
  const updatedItem =
    await api.functional.mallPlatform.customer.carts.items.putByCartidAndCartitemid(
      customerConnection,
      {
        cartId: cart.id,
        cartItemId: createdItem.id,
        body: {
          quantity: updatedQuantity,
        } satisfies IMallPlatformCartItem.IUpdate,
      },
    );
  typia.assert(updatedItem);
  TestValidator.equals(
    "cart item id should remain the same",
    updatedItem.id,
    createdItem.id,
  );
  TestValidator.equals(
    "cart id should remain the same",
    updatedItem.shoppingCart.id,
    cart.id,
  );
  TestValidator.equals(
    "product variant should remain the same",
    updatedItem.productVariant.id,
    createdItem.productVariant.id,
  );
  TestValidator.equals(
    "quantity should be updated",
    updatedItem.quantity,
    updatedQuantity,
  );
  TestValidator.equals(
    "availability state should remain consistent",
    updatedItem.availabilityState,
    createdItem.availabilityState,
  );
}
