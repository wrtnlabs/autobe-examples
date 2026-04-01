import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_option_definitions_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_create";
import { generate_random_shopping_mall_seller_products_option_definitions_option_values_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_option_values_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_option_definition } from "../../../prepare/prepare_random_shopping_mall_product_option_definition";
import { prepare_random_shopping_mall_product_option_value } from "../../../prepare/prepare_random_shopping_mall_product_option_value";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_deletion_blocked_by_pending_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create option definition (e.g., "Color")
  const optionDefinition =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: { name: "Color" },
      },
    );
  typia.assert(optionDefinition);
  // 4. Create option values (e.g., "Red", "Blue")
  const optionValueRed =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerLoginConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: optionDefinition.id,
        },
        body: { name: "Red" },
      },
    );
  typia.assert(optionValueRed);
  const optionValueBlue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerLoginConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: optionDefinition.id,
        },
        body: { name: "Blue" },
      },
    );
  typia.assert(optionValueBlue);
  // 5. Create two variants - one to be ordered (Red), one as backup (Blue)
  const variantToOrder =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-RED-${RandomGenerator.alphaNumeric(6)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [optionValueRed.id],
        },
      },
    );
  typia.assert(variantToOrder);
  const backupVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-BLUE-${RandomGenerator.alphaNumeric(6)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [optionValueBlue.id],
        },
      },
    );
  typia.assert(backupVariant);
  // 6. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: "TestPassword123!",
    },
  });
  // 7. Customer adds variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerLoginConnection,
      {
        body: {
          shopping_mall_product_variant_id: variantToOrder.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 8. Customer creates order (order items will be in 'paid' status)
  // The prepare function handles the address requirement internally
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerLoginConnection,
    {
      body: {
        cart_item_ids: [cartItem.id],
      },
    },
  );
  typia.assert(order);
  // 9. Verify order items are in 'paid' status
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  TestValidator.equals(
    "order item variant matches",
    orderItem.productVariant.id,
    variantToOrder.id,
  );
  // 10. Seller attempts to delete the variant with pending orders
  // This should fail with an error because the variant has paid order items
  await TestValidator.error(
    "variant deletion blocked by pending orders",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.erase(
        sellerLoginConnection,
        {
          productId: product.id,
          variantId: variantToOrder.id,
        },
      );
    },
  );
  // 11. Verify backup variant can be deleted (no pending orders)
  // This confirms the deletion endpoint works when there are no pending orders
  await api.functional.shoppingMall.seller.products.variants.erase(
    sellerLoginConnection,
    {
      productId: product.id,
      variantId: backupVariant.id,
    },
  );
}
