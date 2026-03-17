import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test primary success path for authenticated customer order retrieval.
 *
 * Validates the complete order retrieval workflow including:
 * - Order header information (orderNumber, totalPrice, status)
 * - Shipping address details (recipientName, phone, full address)
 * - Order items with purchase-time snapshots (product, variant, seller info)
 * - Shipment tracking information
 *
 * Flow: Customer → Admin(category) → Seller(product/variant) → Customer(cart/checkout) → Customer(retrieve order)
 */
export async function test_api_customer_order_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for category management
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller connection for product/variant management
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 4. Create category (prerequisite for products)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 5. Create product with the category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Create product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          options: [
            {
              optionName: "color",
              optionValue: RandomGenerator.pick([
                "red",
                "blue",
                "black",
              ] as const),
            } satisfies IEcommerceMallProductVariantOption.ICreate,
            {
              optionName: "size",
              optionValue: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
          price:
            product.basePrice +
            typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<100> &
                tags.Maximum<500>
            >(),
          stock: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 7. Add variant to customer's cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 8. Complete checkout to create the order
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 9. Retrieve the order by ID using the customer connection
  const retrievedOrder = await api.functional.ecommerceMall.customer.orders.at(
    customerConnection,
    { orderId: order.id },
  );
  typia.assert(retrievedOrder);
  // 10. Validate retrieved order matches expected structure
  TestValidator.equals("order id matches", retrievedOrder.id, order.id);
  TestValidator.equals(
    "order number present",
    typeof retrievedOrder.orderNumber,
    "string",
  );
  TestValidator.equals(
    "total price matches",
    retrievedOrder.totalPrice,
    order.totalPrice,
  );
  TestValidator.equals(
    "status present",
    typeof retrievedOrder.status,
    "string",
  );
  TestValidator.equals(
    "recipient name present",
    typeof retrievedOrder.recipientName,
    "string",
  );
  TestValidator.equals(
    "recipient phone present",
    typeof retrievedOrder.recipientPhone,
    "string",
  );
  TestValidator.equals(
    "street address present",
    typeof retrievedOrder.streetAddress,
    "string",
  );
  TestValidator.equals("city present", typeof retrievedOrder.city, "string");
  TestValidator.equals(
    "postal code present",
    typeof retrievedOrder.postalCode,
    "string",
  );
  TestValidator.equals(
    "country present",
    typeof retrievedOrder.country,
    "string",
  );
  TestValidator.predicate(
    "order items array exists",
    Array.isArray(retrievedOrder.orderItems),
  );
  TestValidator.predicate(
    "shipments array exists",
    Array.isArray(retrievedOrder.shipments),
  );
  TestValidator.predicate("customer info exists", !!retrievedOrder.customer);
  // 11. Validate order items contain snapshot information
  TestValidator.predicate(
    "at least one order item exists",
    retrievedOrder.orderItems.length > 0,
  );
  if (retrievedOrder.orderItems.length > 0) {
    const firstItem = retrievedOrder.orderItems[0] as any;
    TestValidator.predicate(
      "order item has product snapshot",
      !!firstItem.product,
    );
    TestValidator.predicate(
      "order item has variant snapshot",
      !!firstItem.variant,
    );
    TestValidator.predicate(
      "order item has seller snapshot",
      !!firstItem.seller,
    );
    TestValidator.equals(
      "order item status exists",
      typeof firstItem.status,
      "string",
    );
    TestValidator.predicate(
      "order item quantity positive",
      firstItem.quantity > 0,
    );
    TestValidator.predicate(
      "order item price non-negative",
      firstItem.priceAtPurchase >= 0,
    );
  }
}