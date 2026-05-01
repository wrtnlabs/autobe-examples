import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test customer retrieval of a product snapshot for their own order item.
 *
 * Validates the complete flow from product setup through order placement to snapshot
 * retrieval. Ensures that the frozen snapshot data — product name, description, base
 * price, category name, and gallery images — is correctly captured at order placement
 * time and remains retrievable by the owning customer. The shopping_mall_product_id
 * and shopping_mall_category_id reference fields are verified for traceability.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and is approved by the administrator.
 * 3. Seller creates a product under the category and uploads gallery images.
 * 4. Seller creates a variant with option values and adds inventory stock.
 * 5. Customer registers, adds the variant to cart, and places an order.
 * 6. Customer retrieves the product snapshot for the order item.
 * 7. Validates all denormalized fields match original values, images are ordered
 *    by display_order ascending, and reference IDs are populated.
 */
export async function test_api_product_snapshot_retrieval_by_owning_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and category setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: undefined },
  );
  typia.assert(category);
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(product);
  // 5. Seller uploads product images
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(image2);
  // 6. Seller creates variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 7. Seller adds inventory stock
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: { quantity_change: 100, reason: "Initial restock for testing" },
    },
  );
  // 8. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 9. Customer adds variant to cart
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    { body: { productVariantId: variant.id, quantity: 1 } },
  );
  // 10. Customer places order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: "123 Test Street",
        city: "Test City",
        state_province: "Test State",
        postal_code: "12345",
        country: "Test Country",
      },
    },
  );
  typia.assert(order);
  // 11. Extract the order item
  const orderItem = order.items[0];
  typia.assert(orderItem);
  TestValidator.predicate("order item exists", orderItem !== undefined);
  // 12. Retrieve product snapshot
  const snapshot =
    await api.functional.shoppingMall.customer.order_items.product_snapshot.at(
      customerConnection,
      { itemId: orderItem.id },
    );
  typia.assert(snapshot);
  // 13. Validate denormalized fields match original values
  TestValidator.equals(
    "snapshot name matches product name",
    snapshot.name,
    product.name,
  );
  TestValidator.equals(
    "snapshot description matches product description",
    snapshot.description,
    product.description,
  );
  TestValidator.equals(
    "snapshot base_price matches product base_price",
    snapshot.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "snapshot category_name matches category name",
    snapshot.category_name,
    category.name,
  );
  // 14. Validate reference IDs for traceability
  TestValidator.equals(
    "snapshot shopping_mall_product_id matches product id",
    snapshot.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "snapshot shopping_mall_category_id matches category id",
    snapshot.shopping_mall_category_id,
    category.id,
  );
  // 15. Validate snapshot images exist and are ordered by displayOrder ascending
  TestValidator.predicate(
    "snapshot has product images",
    snapshot.productSnapshotImages.length > 0,
  );
  for (let i = 1; i < snapshot.productSnapshotImages.length; i++) {
    TestValidator.predicate(
      `product snapshot images ordered by displayOrder ascending at index ${i}`,
      snapshot.productSnapshotImages[i].displayOrder >
        snapshot.productSnapshotImages[i - 1].displayOrder,
    );
  }
  // 16. Validate created_at is populated
  TestValidator.predicate(
    "snapshot created_at is populated",
    snapshot.created_at !== "",
  );
}
