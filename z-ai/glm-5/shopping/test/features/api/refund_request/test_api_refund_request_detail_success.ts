import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_refund_request_detail_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      { body: { name: RandomGenerator.name(1) } },
    );
  typia.assert(category);
  // 2. Seller setup - create product with variant and inventory
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { categoryId: category.id } },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: { quantity_change: 100, reason: "Initial stock for test" },
      },
    );
  typia.assert(inventoryRecord);
  // 3. Customer setup - add to cart and checkout
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      { body: { variant_id: variant.id, quantity: 1 } },
    );
  typia.assert(cartItem);
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    { body: {} },
  );
  typia.assert(order);
  // 4. Seller creates shipment (need to get order item from shipment response)
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: order.id,
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        carrier_name: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  // Use shipment's orderItems to get the actual order item ID
  const orderItemId = shipment.orderItems[0].id;
  // 5. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(confirmedShipment);
  // 6. Create refund request
  const refundReason =
    "Product does not match description. The color is different from what was shown in the product images.";
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId,
          reason: refundReason,
        },
      },
    );
  typia.assert(refundRequest);
  // 7. Test: Retrieve refund request detail
  const retrievedRefund =
    await api.functional.shoppingMall.customer.refund_requests.at(
      customerConnection,
      { refundRequestId: refundRequest.id },
    );
  typia.assert(retrievedRefund);
  // 8. Validations
  TestValidator.equals(
    "refund request ID matches",
    retrievedRefund.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "reason matches exactly",
    retrievedRefund.reason,
    refundReason,
  );
  TestValidator.equals("status is pending", retrievedRefund.status, "pending");
  TestValidator.equals(
    "respondedAt is null",
    retrievedRefund.respondedAt,
    null,
  );
  TestValidator.predicate("createdAt is present", !!retrievedRefund.createdAt);
  // Validate order item details
  TestValidator.predicate("orderItem exists", !!retrievedRefund.orderItem);
  TestValidator.equals(
    "orderItem quantity",
    retrievedRefund.orderItem.quantity,
    1,
  );
  TestValidator.predicate(
    "orderItem has price",
    retrievedRefund.orderItem.price > 0,
  );
  TestValidator.equals(
    "orderItem status is delivered",
    retrievedRefund.orderItem.status,
    "delivered",
  );
  // Validate order reference
  TestValidator.predicate(
    "orderItem has order reference",
    !!retrievedRefund.orderItem.order,
  );
  TestValidator.equals(
    "order number matches",
    retrievedRefund.orderItem.order.order_number,
    order.orderNumber,
  );
  // Validate product reference
  TestValidator.predicate(
    "orderItem has product reference",
    !!retrievedRefund.orderItem.product,
  );
  TestValidator.equals(
    "product name matches",
    retrievedRefund.orderItem.product.name,
    product.name,
  );
  // Validate variant reference
  TestValidator.predicate(
    "orderItem has variant reference",
    !!retrievedRefund.orderItem.variant,
  );
  TestValidator.equals(
    "variant SKU matches",
    retrievedRefund.orderItem.variant.sku_code,
    variant.skuCode,
  );
  // Validate seller reference
  TestValidator.predicate(
    "orderItem has seller reference",
    !!retrievedRefund.orderItem.seller,
  );
  TestValidator.equals(
    "seller shop name matches",
    retrievedRefund.orderItem.seller.shop_name,
    seller.shopName,
  );
  // Validate snapshots array exists
  TestValidator.predicate(
    "snapshots array exists",
    Array.isArray(retrievedRefund.snapshots),
  );
}
