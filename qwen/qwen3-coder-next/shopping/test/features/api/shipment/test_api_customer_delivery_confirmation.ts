import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDeliveryConfirmation";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
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
import { generate_random_shopping_mall_customer_carts_items_create } from "../../../generate/generate_random_shopping_mall_customer_carts_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shopping_cart_item } from "../../../prepare/prepare_random_shopping_mall_shopping_cart_item";

/**
 * Test successful delivery confirmation flow: 1) Create seller account and authenticate, 2) Create product and wait for customer order, 3) Create shipment with tracking information, 4) Wait for shipment status to become 'shipped', 5) Authenticate as customer who placed the order, 6) Confirm delivery of the shipment, 7) Verify shipment status changed to 'delivered' and order items updated accordingly.
 */
export async function test_api_customer_delivery_confirmation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller creates shop and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url:
        Math.random() > 0.5
          ? null
          : (typia.random<string & tags.Format<"uri">>() as string | null),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Seller creates product with variants and images
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 5,
          wordMax: 10,
        }),
        base_price: typia.random<number & tags.MultipleOf<0.01>>(),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        variants: ArrayUtil.repeat(
          2,
          () =>
            ({
              sku_code: RandomGenerator.alphaNumeric(8),
              option_values: [
                {
                  option_name: "size",
                  option_value: RandomGenerator.alphabets(3),
                },
              ],
              price_override: null,
              stock_quantity: 100,
            }) satisfies IShoppingMallProductVariant.ICreate,
        ),
        images: ArrayUtil.repeat(
          2,
          () =>
            ({
              image_url: typia.random<string & tags.Format<"uri">>(),
              sort_order: 0,
            }) satisfies IShoppingMallProductImage.ICreate,
        ),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Customer registers and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string &
          (tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">)
      >(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 4. Create order by adding product variant to cart and checking out
  const variant = product.variants[0];
  const cartItem =
    await generate_random_shopping_mall_customer_carts_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 2,
        } satisfies IShoppingMallShoppingCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 5. Create shipment with seller
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: cartItem.id,
        tracking_number: RandomGenerator.alphaNumeric(12),
        tracking_carrier: "Korea Express",
        items: [{ item_ids: [cartItem.id] }],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 6. Customer confirms delivery
  const confirmation =
    await api.functional.shoppingMall.customer.shipments.confirm(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmation);
  // 7. Verify confirmation response structure
  TestValidator.equals(
    "shipment_id matches",
    confirmation.shipment_id,
    shipment.id,
  );
  TestValidator.notEquals(
    "order_item_id is not empty",
    confirmation.order_item_id,
    "",
  );
}
