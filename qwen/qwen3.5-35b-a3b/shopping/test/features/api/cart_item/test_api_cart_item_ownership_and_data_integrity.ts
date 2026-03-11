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
import { generate_random_ecommerce_mall_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_cart_item_ownership_and_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A authentication
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>() satisfies string as string,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>() satisfies string as string,
        referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerA);
  // 2. Customer A creates shopping cart
  const customerACart: IEcommerceMallShoppingCart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerAConnection,
    );
  typia.assert(customerACart);
  // 3. Generate a random cart item for Customer A
  const cartItem: IEcommerceMallCartItem =
    await generate_random_ecommerce_mall_customer_carts_items_create(
      customerAConnection,
      {
        body: {},
        params: { cartId: customerACart.id },
      },
    );
  typia.assert(cartItem);
  // 4. Customer B authentication
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>() satisfies string as string,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>() satisfies string as string,
        referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerB);
  // 5. Customer B attempts to access Customer A's cart item
  // 6. Verify 404 Not Found when Customer B tries to access Customer A's cart item
  await TestValidator.error(
    "Customer B cannot access Customer A's cart item",
    async () => {
      await api.functional.ecommerceMall.customer.carts.items.at(
        customerBConnection,
        {
          cartId: customerACart.id,
          itemId: cartItem.id,
        },
      );
    },
  );
  // 7. Customer A retrieves their own cart item successfully
  const retrievedItem: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.carts.items.at(
      customerAConnection,
      {
        cartId: customerACart.id,
        itemId: cartItem.id,
      },
    );
  typia.assert(retrievedItem);
  // 8. Verify nested references exist (cart, variant, product)
  TestValidator.equals(
    "cart reference exists",
    retrievedItem.cart.id,
    customerACart.id,
  );
  TestValidator.equals(
    "variant reference exists",
    retrievedItem.variant.id,
    cartItem.variant.id,
  );
  TestValidator.equals(
    "product reference exists",
    retrievedItem.variant.product.id,
    cartItem.variant.product.id,
  );
  // 9. Verify price snapshot is immutable
  TestValidator.equals(
    "price snapshot preserved",
    retrievedItem.price,
    cartItem.price,
  );
  // 10. Verify stockQuantity reflects current status
  TestValidator.equals(
    "stock quantity matches",
    retrievedItem.variant.stockQuantity,
    cartItem.variant.stockQuantity,
  );
  // 11. Verify isActive flags
  TestValidator.equals(
    "variant isActive matches",
    retrievedItem.variant.isActive,
    cartItem.variant.isActive,
  );
  TestValidator.equals(
    "product isActive matches",
    retrievedItem.variant.product.isActive,
    retrievedItem.variant.product.isActive,
  );
  // 12. Verify createdAt timestamp is preserved
  TestValidator.equals(
    "createdAt timestamp preserved",
    retrievedItem.createdAt,
    cartItem.createdAt,
  );
}