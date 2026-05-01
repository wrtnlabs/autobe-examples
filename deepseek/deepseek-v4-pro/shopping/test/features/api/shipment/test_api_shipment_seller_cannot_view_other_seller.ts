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
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
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
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a seller cannot view another seller's shipment.
 *
 * Validates cross-seller data isolation on the shipment retrieval endpoint.
 * When two different sellers have order items in the same customer order, each
 * seller's shipments must remain private to that seller. Seller A creates a
 * shipment for their items, and Seller B attempts to access it — the system
 * must reject Seller B's request because the shipment's seller ID does not
 * match the authenticated seller.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller A registers, gets approved by admin, creates a product with a
 *    variant, and adds inventory stock.
 * 3. Seller B registers, gets approved by admin, creates a product with a
 *    variant, and adds inventory stock.
 * 4. A customer registers and places an order containing items from both
 *    Seller A's and Seller B's products.
 * 5. Seller A creates a shipment for their paid order items.
 * 6. Seller B attempts to retrieve Seller A's shipment and receives a 403
 *    Forbidden error, confirming cross-seller data isolation.
 */
export async function test_api_shipment_seller_cannot_view_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller A setup: join, get approved, create product + variant + inventory
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerA.id,
  });
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      } satisfies DeepPartial<IShoppingMallProduct.ICreate>,
    },
  );
  typia.assert(productA);
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: productA.id },
      },
    );
  typia.assert(variantA);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerAConnection,
    {
      params: { productId: productA.id, variantId: variantA.id },
    },
  );
  // 3. Seller B setup: join, get approved, create product + variant + inventory
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {});
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerB.id,
  });
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      } satisfies DeepPartial<IShoppingMallProduct.ICreate>,
    },
  );
  typia.assert(productB);
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
      },
    );
  typia.assert(variantB);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerBConnection,
    {
      params: { productId: productB.id, variantId: variantB.id },
    },
  );
  // 4. Customer places an order with items from both sellers
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            variant_id: variantA.id,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
          } satisfies IShoppingMallOrderItem.ICreate,
          {
            variant_id: variantB.id,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
      } satisfies DeepPartial<IShoppingMallOrder.ICreate>,
    },
  );
  typia.assert(order);
  // 5. Seller A creates a shipment for their order items
  const sellerAItemIds = order.items
    .filter((item) => item.variant.id === variantA.id)
    .map((item) => item.id);
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerAConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: sellerAItemIds,
        } satisfies DeepPartial<IShoppingMallShipment.ICreate>,
      },
    );
  typia.assert(shipment);
  // 6. Seller B attempts to access Seller A's shipment — must be rejected
  await TestValidator.error(
    "Seller B cannot view Seller A's shipment (cross-seller data isolation)",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.at(
        sellerBConnection,
        {
          orderCode: order.code,
          shipmentId: shipment.id,
        },
      );
    },
  );
}
