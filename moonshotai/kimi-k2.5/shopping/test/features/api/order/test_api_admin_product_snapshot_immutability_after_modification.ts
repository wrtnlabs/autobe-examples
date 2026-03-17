import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
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
 * Test that product snapshots preserve the exact product state at the time of purchase,
 * even when the original product has been modified or deleted by the seller after the order was placed.
 *
 * This validates the immutability and historical preservation requirements of the snapshot system,
 * which is critical for order display accuracy and dispute resolution.
 */
export async function test_api_admin_product_snapshot_immutability_after_modification(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Setup - Create actor connections
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    },
  });
  // Authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      href: "https://example.com/seller",
      referrer: "https://example.com",
      ip: "192.168.1.2",
    },
  });
  // Authenticate as customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
    },
  });
  // Step 2: Admin creates category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // Step 3: Seller creates initial product in the category
  const originalProductName =
    "Original Product Name " + RandomGenerator.alphaNumeric(5);
  const originalProductDescription =
    "Original Description " + RandomGenerator.paragraph({ sentences: 3 });
  const originalBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<1000>
  >();
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: originalProductName,
        description: originalProductDescription,
        categoryId: category.id,
        basePrice: originalBasePrice,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Store original values for later validation
  const createdProductId = product.id;
  const createdProductBasePrice = product.basePrice;
  const createdProductName = product.name;
  // Step 4: Seller creates product variant with initial stock
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: createdProductId,
        },
        body: {
          skuCode: "SKU-" + RandomGenerator.alphaNumeric(8),
          options: [
            {
              optionName: "Size",
              optionValue: "Large",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
          price: typia.random<number & tags.Minimum<50> & tags.Maximum<500>>(),
          stock: 100,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Step 5: Customer adds variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Step 6: Customer creates order to capture product snapshot
  const orderBody = {
    recipientName: RandomGenerator.name(),
    recipientPhone: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
    city: "Seoul",
    state: null,
    postalCode: "12345",
    country: "South Korea",
  } satisfies IEcommerceMallOrder.ICreate;
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);
  // Validate order was created with order items
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  TestValidator.predicate(
    "order item exists",
    order.orderItems[0] !== undefined,
  );
  const orderItem = order.orderItems[0];
  typia.assertGuard(orderItem);
  // Extract IDs from the created order
  const orderId = order.id;
  const itemId = (orderItem as any).id;
  // Extract snapshot ID from the order item's product snapshot reference
  // The order item contains product snapshot data captured at purchase time
  const productSnapshot = (orderItem as any).productSnapshot;
  typia.assertGuard(productSnapshot);
  const snapshotId = productSnapshot.id;
  // Validate initial snapshot state matches original product
  TestValidator.equals(
    "snapshot name matches original product name",
    productSnapshot.name,
    createdProductName,
  );
  TestValidator.equals(
    "snapshot base_price matches original product price",
    productSnapshot.base_price,
    createdProductBasePrice,
  );
  // Step 7: Seller updates product details after order placement
  const updatedProductName =
    "Updated Product Name " + RandomGenerator.alphaNumeric(5);
  const updatedProductDescription =
    "Updated Description " + RandomGenerator.paragraph({ sentences: 3 });
  const updatedBasePrice = createdProductBasePrice + 500;
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: createdProductId,
        body: {
          name: updatedProductName,
          description: updatedProductDescription,
          basePrice: updatedBasePrice,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // Validate product was actually updated
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    updatedProductName,
  );
  TestValidator.equals(
    "product basePrice updated",
    updatedProduct.basePrice,
    updatedBasePrice,
  );
  TestValidator.notEquals(
    "product name changed from original",
    updatedProduct.name,
    createdProductName,
  );
  // Step 8: Seller deletes the product (soft delete)
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: createdProductId,
  });
  // Step 9: Admin retrieves the snapshot using GET endpoint
  const snapshot =
    await api.functional.ecommerceMall.admin.orders.items.product.snapshots.at(
      adminConnection,
      {
        orderId: orderId,
        itemId: itemId,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Success Criteria Validation
  // 1. Snapshot data shows ORIGINAL product state, not current modified/deleted state
  TestValidator.equals(
    "snapshot preserves original product name",
    snapshot.name,
    createdProductName,
  );
  TestValidator.notEquals(
    "snapshot name does not show updated name",
    snapshot.name,
    updatedProductName,
  );
  // 2. Snapshot base_price matches original price
  TestValidator.equals(
    "snapshot preserves original base price",
    snapshot.base_price,
    createdProductBasePrice,
  );
  TestValidator.notEquals(
    "snapshot base price does not show updated price",
    snapshot.base_price,
    updatedBasePrice,
  );
  // 3. Product snapshot is accessible despite original product being deleted
  TestValidator.predicate(
    "snapshot is accessible after product deletion",
    snapshot.id === snapshotId,
  );
  // 4. Snapshot description preserves original
  TestValidator.equals(
    "snapshot preserves original description",
    snapshot.description,
    originalProductDescription,
  );
  // 5. Verify snapshot has proper timestamps
  TestValidator.predicate(
    "snapshot has creation timestamp",
    typeof snapshot.created_at === "string",
  );
  // 6. Business rule: snapshots are immutable - product modifications do not affect stored snapshots
  TestValidator.predicate(
    "snapshot immutability - product modification did not affect snapshot",
    snapshot.name === createdProductName &&
      snapshot.base_price === createdProductBasePrice,
  );
}