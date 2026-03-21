import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_seller_refund_requests_search_by_reason_keyword(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // SETUP: Create seller and authenticate
  // ========================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = sellerAuth.token.access;
  // ========================================
  // SETUP: Create customer and authenticate
  // ========================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = customerAuth.token.access;
  // ========================================
  // SETUP: Create product with variant and inventory
  // ========================================
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { quantity: 10 },
      },
    );
  typia.assert(variant);
  // ========================================
  // SETUP: Customer adds item to cart
  // ========================================
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: { variant_id: variant.id, quantity: 1 },
      },
    );
  typia.assert(cartItem);
  // ========================================
  // SETUP: Customer places order
  // ========================================
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_token_12345",
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  const orderItemId = order.orderItems[0]!.id;
  // ========================================
  // SETUP: Seller ships the order
  // ========================================
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItemId],
        carrier: "TestCarrier",
        trackingNumber: "TRACK123456",
      },
    },
  );
  typia.assert(shipment);
  // ========================================
  // SETUP: Customer confirms delivery
  // ========================================
  await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
    },
  );
  // ========================================
  // TEST: Create refund request with searchable reason
  // Using DeepPartial to allow reason field for creation
  // ========================================
  const refundRequestBody = {
    order_item_id: orderItemId,
    reason: "Product arrived damaged during shipping",
  } as DeepPartial<IEcommerceMallRefundRequest.IRequest>;
  await api.functional.ecommerceMall.customer.refund_requests.index(
    customerConnection,
    {
      body: refundRequestBody,
    },
  );
  // ========================================
  // TEST 1: Search by exact keyword "damaged"
  // ========================================
  const searchDamaged =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          reason_keyword: "damaged",
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchDamaged);
  TestValidator.equals(
    "has results for 'damaged'",
    searchDamaged.data.length > 0,
    true,
  );
  TestValidator.predicate("all results contain 'damaged' in reason", () =>
    searchDamaged.data.every((r) => r.reason.toLowerCase().includes("damaged")),
  );
  // ========================================
  // TEST 2: Case-insensitive search
  // ========================================
  const searchUppercase =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          reason_keyword: "DAMAGED",
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchUppercase);
  TestValidator.equals(
    "case-insensitive search finds results",
    searchUppercase.data.length > 0,
    true,
  );
  // ========================================
  // TEST 3: Partial word match
  // ========================================
  const searchPartial =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          reason_keyword: "damage",
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchPartial);
  TestValidator.equals(
    "partial word 'damage' matches 'damaged'",
    searchPartial.data.length > 0,
    true,
  );
  // ========================================
  // TEST 4: Non-existent keyword returns empty results
  // ========================================
  const searchNonExistent =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          reason_keyword: "nonexistentkeyword12345",
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchNonExistent);
  TestValidator.equals(
    "non-existent keyword returns empty",
    searchNonExistent.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0",
    searchNonExistent.pagination.records,
    0,
  );
  // ========================================
  // TEST 5: Pagination structure is valid
  // ========================================
  const searchPaginated =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          reason_keyword: "damaged",
          limit: 5,
          page: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchPaginated);
  TestValidator.predicate(
    "pagination structure valid",
    () =>
      searchPaginated.pagination.current >= 0 &&
      searchPaginated.pagination.limit >= 0 &&
      searchPaginated.pagination.records >= 0 &&
      searchPaginated.pagination.pages >= 0,
  );
  // ========================================
  // TEST 6: Reason field truncated to 200 characters
  // ========================================
  const longReason =
    "This is a very long reason that exceeds two hundred characters in length. ".repeat(
      5,
    );
  // Create refund request with long reason
  const longReasonBody = {
    order_item_id: orderItemId,
    reason: longReason,
  } as DeepPartial<IEcommerceMallRefundRequest.IRequest>;
  await api.functional.ecommerceMall.customer.refund_requests.index(
    customerConnection,
    {
      body: longReasonBody,
    },
  );
  // Search for keyword from the long reason
  const searchLongReason =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          reason_keyword: "two hundred",
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchLongReason);
  // Verify reason is truncated to 200 characters
  for (const refund of searchLongReason.data) {
    TestValidator.predicate(
      "reason is truncated to 200 characters",
      () => refund.reason.length <= 200,
    );
  }
}
