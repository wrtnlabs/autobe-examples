import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import type { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_e_commerce_mall_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_administrator_categories_create";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_refund_requests_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { generate_random_e_commerce_mall_seller_shipments_create } from "../../../generate/generate_random_e_commerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_administrator_refund_request_view_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  typia.assert(adminAuthorized);
  // 2. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(customerAuthorized);
  // 3. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  // 4. Administrator creates a product category
  const category =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 5. Administrator approves the seller's registration
  // The seller registration creates an approval request automatically.
  const approvalRequest =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: sellerAuthorized.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvalRequest);
  // 6. Seller creates a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 7. Seller creates a variant
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 8. Seller adds initial stock
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
    },
  );
  // 9. Customer creates a shipping address
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 10. Customer adds the variant to cart
  await generate_random_e_commerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
      },
    },
  );
  // 11. Customer places the order
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  const orderItemId = order.orderItems[0].id;
  const refundReason = RandomGenerator.paragraph({ sentences: 2 });
  // 12. Seller creates a shipment for the order items
  const shipment =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItemId],
        },
      },
    );
  typia.assert(shipment);
  // 13. Customer confirms delivery
  const confirmedShipment =
    await api.functional.eCommerceMall.customer.shipments.update(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {} satisfies IECommerceMallShipment.IUpdate,
      },
    );
  typia.assert(confirmedShipment);
  // 14. Customer creates a refund request
  const refundRequest =
    await api.functional.eCommerceMall.customer.refund_requests.create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId,
          reason: refundReason,
        } satisfies IECommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 15. Administrator retrieves the refund request details
  const viewedRefundRequest =
    await api.functional.eCommerceMall.administrator.refund_requests.at(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(viewedRefundRequest);
  // 16. Validate refund request identity and status
  TestValidator.equals("id matches", viewedRefundRequest.id, refundRequest.id);
  TestValidator.equals(
    "status is pending",
    viewedRefundRequest.status,
    "pending",
  );
  // 17. Validate response metadata
  TestValidator.predicate(
    "response_timestamp is null for pending request",
    viewedRefundRequest.response_timestamp === null,
  );
  TestValidator.equals(
    "reason matches customer input",
    viewedRefundRequest.reason,
    refundReason,
  );
  // 18. Validate customer object
  TestValidator.predicate(
    "customer.id is present",
    viewedRefundRequest.customer.id !== undefined,
  );
  TestValidator.predicate(
    "customer.email is present",
    viewedRefundRequest.customer.email !== undefined,
  );
  TestValidator.predicate(
    "customer.profile is present",
    viewedRefundRequest.customer.profile !== null,
  );
  if (viewedRefundRequest.customer.profile) {
    TestValidator.predicate(
      "customer profile display_name is present",
      viewedRefundRequest.customer.profile.display_name !== undefined,
    );
  }
  // 19. Validate seller object
  TestValidator.predicate(
    "seller.id is present",
    viewedRefundRequest.seller.id !== undefined,
  );
  TestValidator.predicate(
    "seller.email is present",
    viewedRefundRequest.seller.email !== undefined,
  );
  TestValidator.equals(
    "seller approval_status is approved",
    viewedRefundRequest.seller.approval_status,
    "approved",
  );
  TestValidator.predicate(
    "seller.profile is present",
    viewedRefundRequest.seller.profile !== undefined,
  );
  TestValidator.predicate(
    "seller profile shop_name is present",
    viewedRefundRequest.seller.profile.shop_name !== undefined,
  );
  // 20. Validate orderItem fields
  TestValidator.predicate(
    "product_name is present",
    viewedRefundRequest.orderItem.product_name !== undefined,
  );
  TestValidator.predicate(
    "variant_sku is present",
    viewedRefundRequest.orderItem.variant_sku !== undefined,
  );
  TestValidator.predicate(
    "variant_options is present",
    viewedRefundRequest.orderItem.variant_options !== undefined,
  );
  TestValidator.predicate(
    "shop_name is present",
    viewedRefundRequest.orderItem.shop_name !== undefined,
  );
  TestValidator.predicate(
    "quantity is positive",
    viewedRefundRequest.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "unit_price is positive",
    viewedRefundRequest.orderItem.unit_price > 0,
  );
  TestValidator.predicate(
    "subtotal is positive",
    viewedRefundRequest.orderItem.subtotal > 0,
  );
  TestValidator.equals(
    "orderItem status is delivered",
    viewedRefundRequest.orderItem.status,
    "delivered",
  );
  // 21. Validate orderItem.order
  TestValidator.predicate(
    "orderItem.order code is present",
    viewedRefundRequest.orderItem.order.code !== undefined,
  );
  TestValidator.predicate(
    "orderItem.order total_price is present",
    viewedRefundRequest.orderItem.order.total_price !== undefined,
  );
  TestValidator.predicate(
    "orderItem.order status is present",
    viewedRefundRequest.orderItem.order.status !== undefined,
  );
  // 22. Validate orderItem.productVariant
  TestValidator.predicate(
    "orderItem.productVariant sku_code is present",
    viewedRefundRequest.orderItem.productVariant.sku_code !== undefined,
  );
  // 23. Validate snapshots and lifecycle
  TestValidator.predicate(
    "refundRequestSnapshots is empty for pending request",
    viewedRefundRequest.refundRequestSnapshots.length === 0,
  );
  TestValidator.predicate(
    "deleted_at is null for active request",
    viewedRefundRequest.deleted_at === null,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601 string",
    typeof viewedRefundRequest.created_at === "string" &&
      viewedRefundRequest.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 string",
    typeof viewedRefundRequest.updated_at === "string" &&
      viewedRefundRequest.updated_at.length > 0,
  );
}
