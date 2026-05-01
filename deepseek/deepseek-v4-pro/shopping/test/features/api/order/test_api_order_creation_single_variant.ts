import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test the complete happy path of order creation with a single product variant.
 *
 * Validates the end-to-end order placement flow where an administrator creates a product category, a seller creates a product with a single variant and initial stock, and a customer places an order for that variant. The test verifies the atomic nature of the transaction by checking all effects simultaneously: order creation with correct status and pricing, stock deduction via negative inventory record, snapshot capture across all three snapshot types (product, variant, seller), and the generated order code.
 *
 * 1. Administrator registers and creates a top-level product category.
 * 2. Seller registers and creates a product under the category with a base price.
 * 3. Seller creates a variant with a unique SKU code, option values (color: "Red"), and no price override, with zero initial stock.
 * 4. Seller records initial stock of 10 units via an explicit inventory record.
 * 5. Customer registers and places an order for 2 units of the variant with a complete shipping address.
 * 6. Validates order status is "paid", total price equals effective price × quantity, frozen unit price matches, all shipping address fields are preserved, product/variant/seller snapshots are present and non-null with correct content, stock decreased from 10 to 8, and order code is generated.
 */
export async function test_api_order_creation_single_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Create product under the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Create variant with specific SKU and option values
  const variantCode = RandomGenerator.alphaNumeric(16);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          code: variantCode,
          optionValues: [{ key: "color", value: "Red" }],
          initialStockQuantity: 0,
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 6. Record initial stock of 10 units
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      body: {
        quantity_change: 10,
        reason: "Initial stock",
      },
      params: {
        productId: product.id,
        variantId: variant.id,
      },
    },
  );
  // 7. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 8. Place order for 2 units with shipping address
  const shippingAddress = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: "123 Test Street",
    city: "Seoul",
    state_province: "Seoul",
    postal_code: "12345",
    country: "South Korea",
  };
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            variant_id: variant.id,
            quantity: 2,
          },
        ],
        ...shippingAddress,
      },
    },
  );
  typia.assert(order);
  // 9. Validate order metadata
  TestValidator.equals("order status is paid", order.status, "paid");
  TestValidator.predicate("order code is generated", order.code.length > 0);
  // 10. Validate order items
  TestValidator.equals("single order item", order.items.length, 1);
  const orderItem = order.items[0];
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  TestValidator.equals("order item quantity", orderItem.quantity, 2);
  // 11. Validate total price and frozen unit price
  const effectivePrice = variant.price ?? product.base_price;
  TestValidator.equals(
    "frozen unit price matches effective price",
    orderItem.price,
    effectivePrice,
  );
  TestValidator.equals(
    "total price equals unit price × quantity",
    order.total_price,
    effectivePrice * 2,
  );
  // 12. Validate shipping address frozen as submitted
  TestValidator.equals(
    "recipient name frozen",
    order.recipient_name,
    shippingAddress.recipient_name,
  );
  TestValidator.equals(
    "phone number frozen",
    order.phone_number,
    shippingAddress.phone_number,
  );
  TestValidator.equals(
    "street address frozen",
    order.street_address,
    shippingAddress.street_address,
  );
  TestValidator.equals("city frozen", order.city, shippingAddress.city);
  TestValidator.equals(
    "state province frozen",
    order.state_province,
    shippingAddress.state_province,
  );
  TestValidator.equals(
    "postal code frozen",
    order.postal_code,
    shippingAddress.postal_code,
  );
  TestValidator.equals(
    "country frozen",
    order.country,
    shippingAddress.country,
  );
  // 13. Validate product snapshot
  TestValidator.predicate(
    "product snapshot is present",
    orderItem.productSnapshot !== null,
  );
  const productSnapshot = orderItem.productSnapshot!;
  TestValidator.predicate(
    "product snapshot has name",
    productSnapshot.name.length > 0,
  );
  TestValidator.predicate(
    "product snapshot has description",
    productSnapshot.description.length > 0,
  );
  // 14. Validate variant snapshot
  TestValidator.predicate(
    "variant snapshot is present",
    orderItem.variantSnapshot !== null,
  );
  const variantSnapshot = orderItem.variantSnapshot!;
  TestValidator.equals(
    "variant snapshot SKU code matches",
    variantSnapshot.sku_code,
    variantCode,
  );
  TestValidator.predicate(
    "variant snapshot has option values",
    variantSnapshot.option_values.length > 0,
  );
  // 15. Validate seller snapshot
  TestValidator.predicate(
    "seller snapshot is present",
    orderItem.sellerSnapshot !== null,
  );
  const sellerSnapshot = orderItem.sellerSnapshot!;
  TestValidator.predicate(
    "seller snapshot has shop name",
    sellerSnapshot.shop_name.length > 0,
  );
  // 16. Validate stock decreased from 10 to 8
  TestValidator.equals(
    "remaining stock after order",
    orderItem.variant.stock_quantity,
    8,
  );
}
