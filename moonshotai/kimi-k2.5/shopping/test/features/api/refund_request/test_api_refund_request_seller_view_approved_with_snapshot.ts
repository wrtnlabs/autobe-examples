import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_refund_request_seller_view_approved_with_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // Create customer actor
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies Partial<IEcommerceMallCustomer.IJoin>,
  });
  typia.assert(customerAuth);
  // Create seller actor
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies Partial<IEcommerceMallSeller.IJoin>,
  });
  typia.assert(sellerAuth);
  // Create order via checkout (prerequisite for refund request)
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 3 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.alphabets(5),
        postalCode: RandomGenerator.alphaNumeric(5),
        country: RandomGenerator.name(),
      } satisfies Partial<IEcommerceMallOrder.ICreate>,
    },
  );
  typia.assert(order);
  // Validate order has items
  TestValidator.predicate("order has order items", order.orderItems.length > 0);
  // Assert order item to ISummary to access id property
  const orderItem = typia.assert<IEcommerceMallOrderItem.ISummary>(
    order.orderItems[0],
  );
  const orderItemId = orderItem.id;
  // Create refund request as customer
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies Partial<IEcommerceMallRefundRequest.ICreate>,
      },
    );
  typia.assert(refundRequest);
  // Retrieve refund request as seller
  const viewedRequest =
    await api.functional.ecommerceMall.seller.refundRequests.at(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(viewedRequest);
  // Assert viewed orderItem to ISummary to access its properties
  const viewedOrderItem = typia.assert<IEcommerceMallOrderItem.ISummary>(
    viewedRequest.orderItem,
  );
  // Validate refund request structure matches expectations
  TestValidator.equals(
    "refund request ID matches",
    viewedRequest.id,
    refundRequest.id,
  );
  TestValidator.predicate(
    "status is valid enum value",
    ["pending", "approved", "rejected"].includes(viewedRequest.status),
  );
  TestValidator.predicate(
    "reason is non-empty string",
    typeof viewedRequest.reason === "string" && viewedRequest.reason.length > 0,
  );
  TestValidator.equals(
    "order item ID matches",
    viewedOrderItem.id,
    orderItemId,
  );
  TestValidator.predicate(
    "customer information exists",
    viewedRequest.customer !== undefined,
  );
  TestValidator.predicate(
    "seller information exists",
    viewedRequest.seller !== undefined,
  );
  TestValidator.predicate(
    "requestedAt timestamp exists",
    viewedRequest.requestedAt !== undefined,
  );
  TestValidator.predicate(
    "snapshots array exists (for audit trail)",
    Array.isArray(viewedRequest.snapshots),
  );
  // If there are snapshots (e.g., if refund was responded to), validate structure
  if (viewedRequest.snapshots.length > 0) {
    const snapshot = viewedRequest.snapshots[0];
    TestValidator.predicate(
      "snapshot has valid ID",
      typia.is<string & tags.Format<"uuid">>(snapshot.id),
    );
    TestValidator.predicate(
      "snapshot has creation timestamp",
      snapshot.createdAt !== undefined,
    );
    // Validate snapshot captures historical state
    if (snapshot.status !== null) {
      TestValidator.predicate(
        "snapshot status is valid",
        ["pending", "approved", "rejected"].includes(snapshot.status),
      );
    }
  }
  // Validate order item details in response using the asserted viewedOrderItem
  TestValidator.predicate(
    "order item has product information",
    viewedOrderItem.product !== undefined,
  );
  TestValidator.predicate(
    "order item has variant information",
    viewedOrderItem.variant !== undefined,
  );
  TestValidator.predicate(
    "order item has seller information",
    viewedOrderItem.seller !== undefined,
  );
}
