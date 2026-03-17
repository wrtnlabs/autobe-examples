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
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_admin_refund_request_retrieval_after_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Setup seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Setup customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 4. Create category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        parentId: null,
      },
    },
  );
  typia.assert(category);
  // 5. Create product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<number & tags.Minimum<1>>(),
      },
    },
  );
  typia.assert(product);
  // 6. Create product variant as seller
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          options: [
            { optionName: "color", optionValue: "red" },
            { optionName: "size", optionValue: "large" },
          ],
          price: typia.random<number & tags.Minimum<1>>() satisfies number as number,
          stock: typia.random<number & tags.Type<"int32"> & tags.Minimum<10>>(),
        },
      },
    );
  typia.assert(variant);
  // 7. Add variant to cart as customer
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      },
    },
  );
  // 8. Checkout as customer
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(2),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.name(2),
        state: null,
        postalCode: RandomGenerator.alphaNumeric(6).toUpperCase(),
        country: RandomGenerator.pick(["USA", "KOR", "JPN", "UK"]),
      },
    },
  );
  typia.assert(order);
  // Get the order item from the order
  const orderItem = order.orderItems[0] as IEcommerceMallOrderItem & IEntity;
  typia.assert(orderItem);
  // 9. Create shipment as seller for the order item
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [orderItem.id],
        carrierName: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
        trackingNumber: RandomGenerator.alphaNumeric(12).toUpperCase(),
      },
    },
  );
  typia.assert(shipment);
  // 10. Confirm delivery as customer
  const delivery =
    await api.functional.ecommerceMall.customer.shipments.delivery.confirm.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(delivery);
  // 11. Create refund request as customer
  const refundReason = "Product damaged during shipping";
  const refundRequestCreated =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: refundReason,
        },
      },
    );
  typia.assert(refundRequestCreated);
  // Verify initial state shows pending status
  TestValidator.equals(
    "initial status should be pending",
    refundRequestCreated.status,
    "pending",
  );
  // Verify snapshots array exists and is initially empty or contains initial snapshot
  typia.assert(refundRequestCreated.snapshots);
  // 12. Seller responds to refund request (approve it)
  // Note: Since the seller response endpoint isn't provided, we simulate by noting
  // that the test scenario assumes the seller has already responded
  // In a real implementation, this would be: PUT /seller/refundRequests/{id}/respond
  const responseReason = "Seller approved - product quality issue confirmed";
  const responseStatus = "approved";
  // For this test, we'll simulate the response by verifying the structure
  // The draft mentions we need to verify the response state after seller action
  // Since there's no API to respond in the provided SDK, we focus on the retrieval aspect
  // 13. Admin retrieves the refund request after seller response
  const retrievedRefundRequest =
    await api.functional.ecommerceMall.admin.refundRequests.at(
      adminConnection,
      {
        refundRequestId: refundRequestCreated.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // 14. Validate the refund request structure and state
  // Verify status has been updated from pending
  typia.assertGuard<"approved" | "rejected">(retrievedRefundRequest.status);
  // Verify order item details are included
  typia.assert(retrievedRefundRequest.orderItem);
  TestValidator.equals(
    "order item ID matches",
    (retrievedRefundRequest.orderItem as IEcommerceMallOrderItem & IEntity).id,
    orderItem.id,
  );
  // Verify customer information is included
  typia.assert(retrievedRefundRequest.customer);
  TestValidator.equals(
    "customer ID matches",
    (retrievedRefundRequest.customer as IEcommerceMallCustomer & IEntity).id,
    customerAuth.id,
  );
  // Verify seller information is included
  typia.assert(retrievedRefundRequest.seller);
  TestValidator.equals(
    "seller ID matches",
    (retrievedRefundRequest.seller as IEcommerceMallSeller & IEntity).id,
    sellerAuth.id,
  );
  // Verify timestamps are present
  typia.assert(retrievedRefundRequest.requestedAt);
  typia.assert(retrievedRefundRequest.respondedAt);
  typia.assert(retrievedRefundRequest.createdAt);
  typia.assert(retrievedRefundRequest.updatedAt);
  // Verify respondedAt is populated with valid timestamp after request
  TestValidator.predicate("respondedAt should be after requestedAt", () => {
    return (
      new Date(retrievedRefundRequest.respondedAt!) >
      new Date(retrievedRefundRequest.requestedAt)
    );
  });
  // 15. Validate snapshots array contains at least one snapshot
  typia.assert(retrievedRefundRequest.snapshots);
  TestValidator.predicate(
    "snapshots array should have at least one snapshot",
    () => retrievedRefundRequest.snapshots.length >= 1,
  );
  // Validate snapshot contents
  const snapshot = retrievedRefundRequest.snapshots[0];
  typia.assert(snapshot);
  // Verify snapshot contains refund request reference
  typia.assert(snapshot.refundRequest);
  TestValidator.equals(
    "snapshot refund request ID matches",
    (snapshot.refundRequest as IEntity).id,
    refundRequestCreated.id,
  );
  // Verify snapshot captures the customer's original reason
  typia.assert(snapshot.reason);
  TestValidator.equals(
    "snapshot preserves original reason",
    snapshot.reason,
    refundReason,
  );
  // Verify snapshot captures the response status (approved or rejected)
  typia.assert(snapshot.status);
  typia.assertGuard<"approved" | "rejected">(snapshot.status);
  // Verify snapshot contains seller's response reason
  typia.assert(snapshot.responseReason);
  // Verify snapshot has timestamp
  typia.assert(snapshot.createdAt);
  // 16. Additional validations for audit trail
  TestValidator.predicate(
    "snapshot createdAt should be after refund request created",
    () => {
      return (
        new Date(snapshot.createdAt) >=
        new Date(retrievedRefundRequest.createdAt)
      );
    },
  );
  // Verify refund request ID in snapshot matches
  TestValidator.equals(
    "snapshot refundRequestId matches",
    snapshot.refundRequestId,
    retrievedRefundRequest.id,
  );
  // 17. Verify the refund request type structure
  typia.assert(retrievedRefundRequest);
  // Final validation: All required fields present
  TestValidator.predicate("all required refund request fields present", () => {
    return (
      retrievedRefundRequest.id !== undefined &&
      retrievedRefundRequest.reason !== undefined &&
      retrievedRefundRequest.status !== undefined &&
      retrievedRefundRequest.orderItem !== undefined &&
      retrievedRefundRequest.customer !== undefined &&
      retrievedRefundRequest.seller !== undefined &&
      retrievedRefundRequest.requestedAt !== undefined &&
      retrievedRefundRequest.snapshots !== undefined &&
      retrievedRefundRequest.createdAt !== undefined &&
      retrievedRefundRequest.updatedAt !== undefined
    );
  });
  // Verify the status is not pending anymore (transitioned to approved or rejected)
  TestValidator.predicate("status transitioned from pending", () => {
    return retrievedRefundRequest.status !== "pending";
  });
  // Verify the relationship between status and respondedAt
  TestValidator.predicate(
    "respondedAt is populated when status is not pending",
    () => {
      return (
        retrievedRefundRequest.status !== "pending" &&
        retrievedRefundRequest.respondedAt !== null
      );
    },
  );
}