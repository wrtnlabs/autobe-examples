import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test shipment carrier and tracking number update before delivery confirmation.
 *
 * Validates that a seller can update both the carrier_name and tracking_number fields on an existing shipment that has not yet been delivered. The test builds the full dependency chain: admin creates a category, seller registers and gets approved, seller creates a product with a stocked variant, customer places an order with that variant, and seller dispatches a shipment for the order items.
 *
 * After shipment creation with initial values ("FedEx", "TRACK-001"), the seller updates both fields to new values ("UPS", "TRACK-002"). Validation confirms the updated carrier and tracking values, that delivered_at remains null (delivery not yet confirmed), and that the shipment still contains the same set of order items.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and is approved by the administrator.
 * 3. Seller logs in, creates a product under the category, and adds a variant with initial stock.
 * 4. Customer registers and places an order containing the seller's variant.
 * 5. Seller creates a shipment for their order items with initial carrier "FedEx" and tracking "TRACK-001".
 * 6. Seller updates the shipment's carrier_name to "UPS" and tracking_number to "TRACK-002".
 * 7. Validates the updated shipment record: carrier and tracking updated, delivery not confirmed, order items preserved.
 */
export async function test_api_shipment_update_carrier_and_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category: IShoppingMallCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerJoinConnection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      },
    });
  typia.assert(sellerAuthorized);
  // Admin approves seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuthorized.id,
  });
  // 3. Seller login and product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: { shopping_mall_category_id: category.id },
      },
    );
  typia.assert(product);
  const variant: IShoppingMallProductVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { initialStockQuantity: 100 },
      },
    );
  typia.assert(variant);
  // 4. Customer registration and order placement
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {
          items: [
            { variant_id: variant.id, quantity: 1 },
          ] as IShoppingMallOrderItem.ICreate[],
        },
      },
    );
  typia.assert(order);
  // 5. Seller creates shipment for their order items
  const sellerOrderItemIds: string[] = order.items
    .filter((item) => item.variant.id === variant.id)
    .map((item) => item.id);
  const shipment: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: sellerOrderItemIds,
          carrier_name: "FedEx",
          tracking_number: "TRACK-001",
        },
      },
    );
  typia.assert(shipment);
  // 6. Seller updates carrier and tracking on the shipment
  const updatedShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.seller.shipments.update(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          carrier_name: "UPS",
          tracking_number: "TRACK-002",
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  // 7. Validate updated shipment
  TestValidator.equals(
    "carrier name updated to UPS",
    updatedShipment.carrier_name,
    "UPS",
  );
  TestValidator.equals(
    "tracking number updated to TRACK-002",
    updatedShipment.tracking_number,
    "TRACK-002",
  );
  TestValidator.equals(
    "delivery not yet confirmed",
    updatedShipment.delivered_at,
    null,
  );
  TestValidator.equals(
    "shipment id unchanged",
    updatedShipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "same number of order items preserved",
    updatedShipment.orderItems.length,
    shipment.orderItems.length,
  );
}
