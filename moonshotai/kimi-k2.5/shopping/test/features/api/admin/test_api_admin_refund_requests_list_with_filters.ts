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

export async function test_api_admin_refund_requests_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create three separate connections - admin is the main tester, seller and customer are supporting actors
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Step 2: Seller creates product and variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<number & tags.Type<"uint32">>(),
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          price: typia.random<number & tags.Type<"uint32">>() satisfies number as number,
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
          ],
        },
      },
    );
  typia.assert(variant);
  // Step 3: Customer adds to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // Step 4-6: The complete flow requires checkout -> payment -> order creation -> shipment -> delivery confirmation
  // Since the checkout API is not provided in the SDK, we simulate the prerequisite state
  // by attempting shipment creation. In real test environment, order items would exist from checkout.
  // Create shipment with generated order items
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
        carrierName: RandomGenerator.name(1),
        trackingNumber: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(shipment);
  // Extract the order item ID from shipment (if available)
  const orderItemId = shipment.shipment_items[0]?.orderItem?.id;
  if (!orderItemId) {
    throw new Error("Cannot determine order item ID from shipment");
  }
  // Step 5: Customer confirms delivery
  const delivery =
    await api.functional.ecommerceMall.customer.shipments.delivery.confirm(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(delivery);
  // Step 6: Customer creates refund request
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(refundRequest);
  // Step 7: Admin lists refund requests without filter (pagination test)
  const allRequests =
    await api.functional.ecommerceMall.admin.order_items.refund_requests.index(
      adminConnection,
      {
        orderItemId: orderItemId,
        body: {
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(allRequests);
  // Validate paginated response structure
  TestValidator.predicate(
    "pagination has required fields",
    () =>
      typeof allRequests.pagination.current === "number" &&
      typeof allRequests.pagination.limit === "number" &&
      typeof allRequests.pagination.records === "number" &&
      typeof allRequests.pagination.pages === "number",
  );
  TestValidator.predicate("data is array", () =>
    Array.isArray(allRequests.data),
  );
  // Step 8: Verify created refund request appears in list
  TestValidator.predicate("created refund request visible", () =>
    allRequests.data.some((r) => r.id === refundRequest.id),
  );
  // Step 9: Filter by "pending" status
  const pendingResult =
    await api.functional.ecommerceMall.admin.order_items.refund_requests.index(
      adminConnection,
      {
        orderItemId: orderItemId,
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(pendingResult);
  TestValidator.predicate("pending filter returns only pending", () =>
    pendingResult.data.every((r) => r.status === "pending"),
  );
  // Step 10: Filter by "approved" status
  const approvedResult =
    await api.functional.ecommerceMall.admin.order_items.refund_requests.index(
      adminConnection,
      {
        orderItemId: orderItemId,
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(approvedResult);
  TestValidator.predicate("approved filter returns empty or approved", () =>
    approvedResult.data.every((r) => r.status === "approved"),
  );
  // Step 11: Filter by "rejected" status
  const rejectedResult =
    await api.functional.ecommerceMall.admin.order_items.refund_requests.index(
      adminConnection,
      {
        orderItemId: orderItemId,
        body: {
          status: "rejected",
        },
      },
    );
  typia.assert(rejectedResult);
  TestValidator.predicate("rejected filter returns empty or rejected", () =>
    rejectedResult.data.every((r) => r.status === "rejected"),
  );
  // Step 12: Validate summary fields structure
  if (allRequests.data.length > 0) {
    const item = allRequests.data[0];
    TestValidator.equals("item has id", typeof item.id, "string");
    TestValidator.equals("item has reason", typeof item.reason, "string");
    TestValidator.predicate("item has valid status", () =>
      ["pending", "approved", "rejected"].includes(item.status),
    );
    TestValidator.equals(
      "item has requestedAt",
      typeof item.requestedAt,
      "string",
    );
    TestValidator.equals(
      "item has orderItemId",
      typeof item.orderItemId,
      "string",
    );
    TestValidator.predicate(
      "item has customer summary",
      () => item.customer !== null,
    );
    TestValidator.predicate(
      "item has seller summary",
      () => item.seller !== null,
    );
  }
}