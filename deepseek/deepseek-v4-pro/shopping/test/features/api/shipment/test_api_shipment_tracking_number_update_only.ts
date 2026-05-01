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
 * Test updating only the tracking number of a shipment while preserving the carrier name.
 *
 * Validates that the customer-side shipment update endpoint correctly handles partial updates when only the tracking_number field is provided. The test builds the full preconditions: an admin creates a product category, a seller registers and creates a product with a variant and sufficient inventory, a customer places an order for that variant, and the seller dispatches a shipment with initial carrier ("UPS") and tracking number ("1Z9999W99999999999").
 *
 * The customer then updates the shipment providing only tracking_number ("1Z8888W88888888888") and omitting carrier_name entirely. The system must update only the provided field, leaving carrier_name unchanged.
 *
 * 1. Admin joins and creates a category.
 * 2. Seller joins, creates a product under the category, creates a variant, and adds inventory.
 * 3. Customer joins and places an order for the variant.
 * 4. Seller creates a shipment with carrier "UPS" and tracking "1Z9999W99999999999".
 * 5. Customer updates the shipment setting only tracking_number to "1Z8888W88888888888".
 * 6. Verifies tracking_number is updated, carrier_name stays "UPS", created_at unchanged, updated_at refreshed, and all order items have "shipped" status.
 */
export async function test_api_shipment_tracking_number_update_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller joins and creates product with variant and inventory
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
    },
  );
  // 3. Customer joins and places order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            variant_id: variant.id,
            quantity: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
      },
    },
  );
  typia.assert(order);
  // 4. Seller creates shipment with initial carrier and tracking
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: order.items.map((item) => item.id),
          carrier_name: "UPS",
          tracking_number: "1Z9999W99999999999",
        },
        params: { orderId: order.id },
      },
    );
  typia.assert(shipment);
  // 5. Customer updates only tracking number
  const updatedShipment =
    await api.functional.shoppingMall.customer.orders.shipments.update(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: {
          tracking_number: "1Z8888W88888888888",
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  // 6. Verify tracking_number is updated
  TestValidator.equals(
    "tracking_number is updated",
    updatedShipment.tracking_number,
    "1Z8888W88888888888",
  );
  // 7. Verify carrier_name remains unchanged
  TestValidator.equals(
    "carrier_name remains unchanged",
    updatedShipment.carrier_name,
    "UPS",
  );
  // 8. Verify created_at unchanged
  TestValidator.equals(
    "created_at remains unchanged",
    updatedShipment.created_at,
    shipment.created_at,
  );
  // 9. Verify updated_at is refreshed
  TestValidator.notEquals(
    "updated_at is refreshed",
    shipment.updated_at,
    updatedShipment.updated_at,
  );
  // 10. Verify all order items have "shipped" status
  TestValidator.predicate(
    "shipment has order items",
    updatedShipment.orderItems.length > 0,
  );
  for (const orderItem of updatedShipment.orderItems) {
    TestValidator.equals(
      "order item status is shipped",
      orderItem.status,
      "shipped",
    );
  }
}
