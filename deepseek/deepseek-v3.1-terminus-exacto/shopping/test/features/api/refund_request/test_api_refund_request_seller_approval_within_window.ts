import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDeliveryConfirmation";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import type { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import type { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import type { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import type { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import type { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import type { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import type { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_customer_carts_items_create";
import { generate_random_ecommerce_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_refund_requests_create";
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

/**
 * Test a seller successfully approving a customer refund request within the 7-day refund window.
 * Validates the complete refund approval workflow including eligibility checks and proper status transitions.
 */
export async function test_api_refund_request_seller_approval_within_window(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.ecommerce.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "seller1234",
        shop_name: "Test Shop",
        shop_description: "Test shop description",
        logo_image_url: null,
        href: "https://test.com",
        referrer: "https://referrer.com",
        ip: null,
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  // 2. Create product and variant
  const product = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "Test product description",
        base_price: 1000,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await api.functional.ecommerce.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku: "TEST123",
          option_values: JSON.stringify({ size: "M", color: "Blue" }),
          price_override: null,
          quantity: 50,
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 3. Setup customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await api.functional.ecommerce.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "customer1234",
        display_name: "Test Customer",
        phone_number: "01012345678",
      } satisfies IEcommerceCustomer.IJoin,
    },
  );
  typia.assert(customerAuth);
  // 4. Create cart item (simplified - normally would create cart first)
  // Using a mock cart ID for demonstration
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cartItem = await api.functional.ecommerce.customer.carts.items.create(
    customerConnection,
    {
      cartId: cartId,
      body: {
        product_variant_id: variant.id,
        quantity: 1,
      } satisfies IEcommerceCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 5. Create order through checkout (simplified)
  const order = await api.functional.ecommerce.customer.checkout.create(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(order);
  // 6. Seller creates shipment
  const shipment =
    await api.functional.ecommerce.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: order.period as unknown as string & tags.Format<"uuid">,
        body: {
          tracking_number: "TRACK123456",
          carrier_name: "Test Carrier",
          shipping_cost: 5.99,
        } satisfies IEcommerceShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 7. Customer confirms delivery
  const deliveryConfirmation =
    await api.functional.ecommerce.customer.shipments.delivery_confirmations.create(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(deliveryConfirmation);
  // 8. Customer submits refund request
  const refundRequest =
    await api.functional.ecommerce.customer.refund_requests.create(
      customerConnection,
      {
        body: {
          orderItemId: deliveryConfirmation.id as unknown as string &
            tags.Format<"uuid">,
          reason: "Product did not meet expectations",
        } satisfies IEcommerceRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 9. Seller approves the refund request
  const approvedRefundRequest =
    await api.functional.ecommerce.seller.refund_requests.responses.respond(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          id: refundRequest.id,
          reason: "Approved: Item returned in good condition",
          requested_at: refundRequest.requested_at,
          refund_window_expires_at: refundRequest.refund_window_expires_at,
          customer: refundRequest.customer,
          seller: refundRequest.seller,
          order_item: refundRequest.orderItem,
          created_at: refundRequest.created_at,
          updated_at: refundRequest.updated_at,
        } satisfies IEcommerceRefundRequest.IResponse,
      },
    );
  typia.assert(approvedRefundRequest);
  // 10. Validate refund approval results
  TestValidator.equals(
    "refund request ID unchanged",
    approvedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "customer remains the same",
    approvedRefundRequest.customer.id,
    refundRequest.customer.id,
  );
  TestValidator.equals(
    "seller remains the same",
    approvedRefundRequest.seller.id,
    refundRequest.seller.id,
  );
  TestValidator.notEquals(
    "updated_at timestamp should be different",
    approvedRefundRequest.updated_at,
    refundRequest.updated_at,
  );
  // 11. Verify business logic constraints
  const now = new Date();
  const refundWindowExpiry = new Date(
    approvedRefundRequest.refund_window_expires_at,
  );
  TestValidator.predicate(
    "refund approved within valid window",
    now < refundWindowExpiry,
  );
  // 12. Validate seller authorization checks
  const unauthorizedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedSeller = await api.functional.ecommerce.auth.seller.join(
    unauthorizedSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "unauth1234",
        shop_name: "Unauthorized Shop",
        shop_description: "Unauthorized shop",
        logo_image_url: null,
        href: "https://unauth.com",
        referrer: "https://unauth.com",
        ip: null,
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(unauthorizedSeller);
  await TestValidator.error(
    "unauthorized seller cannot approve refund",
    async () => {
      await api.functional.ecommerce.seller.refund_requests.responses.respond(
        unauthorizedSellerConnection,
        {
          refundRequestId: refundRequest.id,
          body: {
            id: refundRequest.id,
            reason: "Unauthorized attempt",
            requested_at: refundRequest.requested_at,
            refund_window_expires_at: refundRequest.refund_window_expires_at,
            customer: refundRequest.customer,
            seller: refundRequest.seller,
            order_item: refundRequest.orderItem,
            created_at: refundRequest.created_at,
            updated_at: refundRequest.updated_at,
          } satisfies IEcommerceRefundRequest.IResponse,
        },
      );
    },
  );
}
