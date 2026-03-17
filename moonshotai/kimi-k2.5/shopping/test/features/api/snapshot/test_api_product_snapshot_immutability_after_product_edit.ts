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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemProductSnapshot";
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
 * Test snapshot immutability by verifying that product snapshots remain unchanged after subsequent product edits.
 * First, complete a purchase to create initial snapshots. Then have the seller update the product's name,
 * description, and base price. Query the product snapshots endpoint and validate that the returned snapshot
 * still contains the original product name, base price, and category as they existed at purchase time.
 */
export async function test_api_product_snapshot_immutability_after_product_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and register as admin for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies DeepPartial<IEcommerceMallAdmin.IJoin>,
  });
  // 2. Create category for product
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Create seller connection and register as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IEcommerceMallSeller.IJoin>,
  });
  typia.assert(seller);
  // 4. Create product with specific name and price
  const originalProductName = RandomGenerator.name();
  const originalBasePrice = typia.random<
    number & tags.Minimum<100> & tags.Maximum<1000>
  >();
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: originalProductName,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: originalBasePrice,
      } satisfies DeepPartial<IEcommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 5. Create product variant with stock
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${typia.random<string & tags.Format<"uuid">>().substring(0, 8)}`,
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
          price: originalBasePrice,
          stock: 100,
        } satisfies DeepPartial<IEcommerceMallProductVariant.ICreate>,
      },
    );
  typia.assert(variant);
  // 6. Create customer connection and register as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 7. Add product variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies DeepPartial<IEcommerceMallCartItem.ICreate>,
      },
    );
  typia.assert(cartItem);
  // 8. Checkout to create order (this creates the initial snapshots)
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.name(),
        city: RandomGenerator.name(),
        state: null,
        postalCode: typia.random<string>(),
        country: RandomGenerator.name(),
      } satisfies DeepPartial<IEcommerceMallOrder.ICreate>,
    },
  );
  typia.assert(order);
  typia.assert(order.orderItems.length > 0);
  const orderId = order.id;
  const orderItem = typia.assert<IEcommerceMallOrderItem.ISummary>(
    order.orderItems[0],
  );
  const orderItemId = orderItem.id;
  // 9. Capture the original values from the order item for comparison
  const originalSnapshot =
    await api.functional.ecommerceMall.customer.orders.items.product.snapshots.index(
      customerConnection,
      {
        orderId,
        itemId: orderItemId,
        body: {
          search: null,
          page: null,
          limit: null,
          createdAtFrom: null,
          createdAtTo: null,
        } satisfies IEcommerceMallOrderItemProductSnapshot.IRequest,
      },
    );
  typia.assert(originalSnapshot);
  typia.assert(originalSnapshot.data.length > 0);
  const originalSnapshotData = originalSnapshot.data[0];
  const originalSnapshotName = originalSnapshotData.name;
  const originalSnapshotBasePrice = originalSnapshotData.basePrice;
  const originalSnapshotCategoryName = originalSnapshotData.categoryName;
  // 10. Seller updates the product - modifying name, description, and base price
  const updatedProductName = RandomGenerator.name();
  const updatedBasePrice =
    originalBasePrice +
    typia.random<number & tags.Minimum<100> & tags.Maximum<500>>();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: updatedProductName,
          description: updatedDescription,
          basePrice: updatedBasePrice,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // Verify the product was actually updated
  TestValidator.equals(
    "product name should be updated",
    updatedProduct.name,
    updatedProductName,
  );
  TestValidator.equals(
    "product basePrice should be updated",
    updatedProduct.basePrice,
    updatedBasePrice,
  );
  // 11. Query the product snapshots endpoint again after product update
  const postUpdateSnapshot =
    await api.functional.ecommerceMall.customer.orders.items.product.snapshots.index(
      customerConnection,
      {
        orderId,
        itemId: orderItemId,
        body: {
          search: null,
          page: null,
          limit: null,
          createdAtFrom: null,
          createdAtTo: null,
        } satisfies IEcommerceMallOrderItemProductSnapshot.IRequest,
      },
    );
  typia.assert(postUpdateSnapshot);
  typia.assert(postUpdateSnapshot.data.length > 0);
  const postUpdateSnapshotData = postUpdateSnapshot.data[0];
  // 12. Validate that snapshot contains the original values, not the updated ones
  TestValidator.equals(
    "snapshot should preserve original product name",
    postUpdateSnapshotData.name,
    originalSnapshotName,
  );
  TestValidator.equals(
    "snapshot should preserve original base price",
    postUpdateSnapshotData.basePrice,
    originalSnapshotBasePrice,
  );
  TestValidator.equals(
    "snapshot should preserve original category name",
    postUpdateSnapshotData.categoryName,
    originalSnapshotCategoryName,
  );
  // 13. Ensure snapshot values are different from current product values
  TestValidator.notEquals(
    "snapshot name should differ from updated product name",
    postUpdateSnapshotData.name,
    updatedProductName,
  );
  TestValidator.notEquals(
    "snapshot basePrice should differ from updated product basePrice",
    postUpdateSnapshotData.basePrice,
    updatedBasePrice,
  );
}
