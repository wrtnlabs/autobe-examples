import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { prepare_random_shopping_mall_shopping_cart } from "../../../prepare/prepare_random_shopping_mall_shopping_cart";

export async function test_api_shopping_cart_item_stock_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.shoppingMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<
          string &
            tags.MinLength<1> &
            tags.MaxLength<255> &
            tags.Format<"email">
        >(),
        password: "1234",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(customer);
  // 2. Get a random product variant for testing
  // Using typia.random to generate a variant with known properties
  const productVariant: IShoppingMallProductVariant.ISummary =
    typia.random<IShoppingMallProductVariant.ISummary>();
  typia.assert(productVariant);
  // Ensure stock_quantity is not null before using it
  if (
    productVariant.stock_quantity === null ||
    productVariant.stock_quantity === undefined
  ) {
    throw new Error("Variant must have stock_quantity for this test");
  }
  // 3. Test stock validation - attempt to add more than available
  const tooManyQuantity = productVariant.stock_quantity + 10; // Exceeds available stock
  await TestValidator.error("insufficient stock validation", async () => {
    await api.functional.shoppingMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: productVariant.id,
          quantity: tooManyQuantity,
        } satisfies IShoppingMallShoppingCart.ICreate,
      },
    );
  });
  // 4. Verify valid quantity still works
  const validQuantity = Math.min(2, productVariant.stock_quantity); // Within available stock
  const cartItem = await api.functional.shoppingMall.customer.cart.items.create(
    customerConnection,
    {
      body: {
        shopping_mall_product_variant_id: productVariant.id,
        quantity: validQuantity,
      } satisfies IShoppingMallShoppingCart.ICreate,
    },
  );
  typia.assert(cartItem);
  TestValidator.equals("quantity matches", cartItem.quantity, validQuantity);
}
