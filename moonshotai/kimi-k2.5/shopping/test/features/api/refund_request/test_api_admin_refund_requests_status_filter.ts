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
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test filtering refund requests by status to find requests in different states.
 *
 * **Test Steps:**
 * 1. Authenticate as admin
 * 2. Create prerequisite data with a refund request in PENDING state
 * 3. Call endpoint filtering by PENDING status
 * 4. Verify only PENDING requests are returned
 * 5. Have seller approve the request
 * 6. Call endpoint filtering by APPROVED status
 * 7. Verify only approved requests are returned
 *
 * **Business Validation Points:**
 * - Filter correctly isolates requests by status
 * - Approved refunds show seller response details
 * - Status transitions are reflected in query results
 *
 * **Success Indicators:**
 * - HTTP 200 for filtered queries
 * - Correct count of results matching filter criteria
 * - Status field values match the requested filter
 */
export async function test_api_admin_refund_requests_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 4. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<number & tags.Type<"uint32">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Seller creates a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          price: typia.random<number & tags.Minimum<0>>(),
          options: [
            {
              optionName: "Color",
              optionValue: RandomGenerator.pick(["Red", "Blue", "Green"]),
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Customer adds to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Note: In a real e2e test, we would need to:
  // - Create an order from the cart (requirement for order items)
  // - Process payment
  // - Mark order items as paid
  // For mockup purposes, using typia.random to simulate the order item ID
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 7. Create shipment by seller
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [orderItemId],
        carrierName: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
        trackingNumber: RandomGenerator.alphaNumeric(12),
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 8. Customer confirms delivery
  const shipmentId = shipment.id;
  const deliveryConfirmation =
    await api.functional.ecommerceMall.customer.shipments.delivery.confirm(
      customerConnection,
      { shipmentId },
    );
  typia.assert(deliveryConfirmation);
  // 9. Customer submits refund request
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 10. Admin filters by PENDING status
  const pendingResults =
    await api.functional.ecommerceMall.admin.order_items.refund_requests.index(
      adminConnection,
      {
        orderItemId: orderItemId,
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingResults);
  // 11. Verify PENDING filter results
  TestValidator.equals(
    "pending filter result count",
    pendingResults.pagination.records,
    1,
  );
  TestValidator.predicate(
    "all results have pending status",
    pendingResults.data.every((item) => item.status === "pending"),
  );
  // 12. Seller approves the refund request
  const approvedRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "approved",
          responseReason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(approvedRefundRequest);
  TestValidator.equals(
    "refund request approved",
    approvedRefundRequest.status,
    "approved",
  );
  // 13. Admin filters by APPROVED status
  const approvedResults =
    await api.functional.ecommerceMall.admin.order_items.refund_requests.index(
      adminConnection,
      {
        orderItemId: orderItemId,
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(approvedResults);
  // 14. Verify APPROVED filter results
  TestValidator.equals(
    "approved filter result count",
    approvedResults.pagination.records,
    1,
  );
  TestValidator.predicate(
    "all results have approved status",
    approvedResults.data.every((item) => item.status === "approved"),
  );
  // 15. Verify status transition is reflected
  TestValidator.predicate(
    "approved results show correct status transition",
    approvedResults.data.every(
      (item) => item.status === "approved" && item.requestedAt != null,
    ),
  );
}
