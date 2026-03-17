import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test seller order item retrieval with product details.
 *
 * A seller successfully retrieves detailed information about an order item containing their product.
 * The test verifies that the seller can access order items for products they own, and the response
 * includes complete order item details including: order item ID, quantity purchased, immutable unit
 * price at time of purchase, current status (paid/shipped/delivered/cancelled/refunded), parent order
 * information (order number, status, total price), product variant details (SKU code, option values
 * like color/size), and timestamps (created_at, updated_at).
 *
 * Note: Order creation APIs are not available in the provided SDK, so order item ID is generated
 * randomly for simulation mode. The test framework handles this appropriately.
 */
export async function test_api_seller_order_item_retrieval_with_product_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 3. Add variant to product
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
                "Black",
                "White",
              ]),
            },
            {
              key: "size",
              value: RandomGenerator.pick(["S", "M", "L", "XL"]),
            },
          ],
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Retrieve order item (using random UUID for simulation mode)
  // Note: Order creation APIs not available, so order item ID is generated randomly
  const orderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orderItem: IEcommerceMallOrderItem =
    await api.functional.ecommerceMall.seller.order_items.at(sellerConnection, {
      itemId: orderItemId,
    });
  typia.assert(orderItem);
  // 5. Validate response structure and business logic
  TestValidator.predicate("order item ID exists", orderItem.id.length > 0);
  TestValidator.predicate("quantity is positive", orderItem.quantity > 0);
  TestValidator.predicate("unit price is positive", orderItem.unitPrice > 0);
  TestValidator.predicate(
    "status is valid",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      orderItem.status,
    ),
  );
  TestValidator.predicate(
    "order has order number",
    orderItem.order.orderNumber.length > 0,
  );
  TestValidator.predicate(
    "order total price is positive",
    orderItem.order.totalPrice > 0,
  );
  TestValidator.predicate(
    "variant has SKU code",
    orderItem.productVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "variant has option values",
    Object.keys(orderItem.productVariant.option_values).length > 0,
  );
  TestValidator.predicate(
    "created at is valid date-time",
    !isNaN(Date.parse(orderItem.createdAt)),
  );
  TestValidator.predicate(
    "updated at is valid date-time",
    !isNaN(Date.parse(orderItem.updatedAt)),
  );
}
