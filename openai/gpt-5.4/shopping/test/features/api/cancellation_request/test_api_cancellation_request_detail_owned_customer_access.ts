import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddressSnapshot";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import type { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_request_detail_owned_customer_access(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const created =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(created);
  const baselineCancellationRequestId = created.id;
  const baselineReason = created.reason;
  const baselineStatus = created.status;
  const baselineReviewedByType = created.reviewed_by_type;
  const baselineReviewedAt = created.reviewed_at;
  const baselineDecisionNote = created.decision_note;
  const baselineCreatedAt = created.created_at;
  const baselineDeletedAt = created.deleted_at;
  const baselineCustomerId = created.customer.id;
  const baselineCustomerEmail = created.customer.email;
  const baselineOrderItemId = created.orderItem.id;
  const baselineOrderItemStatus = created.orderItem.status;
  const baselineOrderItemQuantity = created.orderItem.quantity;
  const baselineOrderItemUnitPrice = created.orderItem.unit_price;
  const baselineOrderItemDeliveredAt = created.orderItem.delivered_at;
  const baselineOrderItemCreatedAt = created.orderItem.created_at;
  const baselineOrderItemDeletedAt = created.orderItem.deleted_at;
  const baselineOrderId = created.orderItem.order.id;
  const baselineOrderCode = created.orderItem.order.code;
  const baselineOrderStatus = created.orderItem.order.status;
  const baselineOrderTotalPrice = created.orderItem.order.total_price;
  const baselineOrderCreatedAt = created.orderItem.order.created_at;
  const baselineOrderDeletedAt = created.orderItem.order.deleted_at;
  const baselineProductVariantId = created.orderItem.productVariant.id;
  const baselineShipmentId = created.orderItem.shipment?.id ?? null;
  const baselineRefundRequestId = created.orderItem.refundRequest?.id ?? null;
  const baselineNestedCancellationRequestId =
    created.orderItem.cancellationRequest?.id ?? null;
  const found =
    await api.functional.shoppingMall.customer.cancellation_requests.at(
      customerConnection,
      {
        cancellationRequestId: created.id,
      },
    );
  typia.assert(found);
  TestValidator.equals(
    "cancellation request id matches created request",
    found.id,
    baselineCancellationRequestId,
  );
  TestValidator.equals(
    "customer reason remains unchanged",
    found.reason,
    baselineReason,
  );
  TestValidator.equals(
    "cancellation workflow status remains unchanged",
    found.status,
    baselineStatus,
  );
  TestValidator.equals(
    "latest reviewer actor type remains unchanged",
    found.reviewed_by_type,
    baselineReviewedByType,
  );
  TestValidator.equals(
    "latest reviewed timestamp remains unchanged",
    found.reviewed_at,
    baselineReviewedAt,
  );
  TestValidator.equals(
    "latest decision note remains unchanged",
    found.decision_note,
    baselineDecisionNote,
  );
  TestValidator.equals(
    "cancellation request created_at remains unchanged",
    found.created_at,
    baselineCreatedAt,
  );
  TestValidator.equals(
    "cancellation request deleted_at remains unchanged",
    found.deleted_at,
    baselineDeletedAt,
  );
  TestValidator.equals(
    "owned customer id matches authorized customer",
    found.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "owned customer id matches created customer",
    found.customer.id,
    baselineCustomerId,
  );
  TestValidator.equals(
    "owned customer email remains consistent",
    found.customer.email,
    baselineCustomerEmail,
  );
  TestValidator.equals(
    "parent order customer matches authenticated owner",
    found.orderItem.order.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "parent order customer matches created customer",
    found.orderItem.order.customer.id,
    baselineCustomerId,
  );
  TestValidator.equals(
    "linked order item id matches selected purchased item",
    found.orderItem.id,
    baselineOrderItemId,
  );
  TestValidator.equals(
    "linked order item status remains unchanged",
    found.orderItem.status,
    baselineOrderItemStatus,
  );
  TestValidator.equals(
    "linked order item quantity remains unchanged",
    found.orderItem.quantity,
    baselineOrderItemQuantity,
  );
  TestValidator.equals(
    "linked order item unit price remains unchanged",
    found.orderItem.unit_price,
    baselineOrderItemUnitPrice,
  );
  TestValidator.equals(
    "linked order item delivered_at remains unchanged",
    found.orderItem.delivered_at,
    baselineOrderItemDeliveredAt,
  );
  TestValidator.equals(
    "linked order item created_at remains unchanged",
    found.orderItem.created_at,
    baselineOrderItemCreatedAt,
  );
  TestValidator.equals(
    "linked order item deleted_at remains unchanged",
    found.orderItem.deleted_at,
    baselineOrderItemDeletedAt,
  );
  TestValidator.equals(
    "linked product variant remains the same",
    found.orderItem.productVariant.id,
    baselineProductVariantId,
  );
  TestValidator.equals(
    "linked shipment identity remains unchanged",
    found.orderItem.shipment?.id ?? null,
    baselineShipmentId,
  );
  TestValidator.equals(
    "linked refund request identity remains unchanged",
    found.orderItem.refundRequest?.id ?? null,
    baselineRefundRequestId,
  );
  TestValidator.equals(
    "parent order id remains unchanged",
    found.orderItem.order.id,
    baselineOrderId,
  );
  TestValidator.equals(
    "parent order code remains unchanged",
    found.orderItem.order.code,
    baselineOrderCode,
  );
  TestValidator.equals(
    "parent order status remains unchanged",
    found.orderItem.order.status,
    baselineOrderStatus,
  );
  TestValidator.equals(
    "parent order total price remains unchanged",
    found.orderItem.order.total_price,
    baselineOrderTotalPrice,
  );
  TestValidator.equals(
    "parent order created_at remains unchanged",
    found.orderItem.order.created_at,
    baselineOrderCreatedAt,
  );
  TestValidator.equals(
    "parent order deleted_at remains unchanged",
    found.orderItem.order.deleted_at,
    baselineOrderDeletedAt,
  );
  TestValidator.predicate(
    "parent order still contains the selected order item",
    ArrayUtil.has(
      found.orderItem.order.items,
      (item) => item.id === found.orderItem.id,
    ),
  );
  TestValidator.equals(
    "selected order item appears exactly once in parent order items",
    found.orderItem.order.items.filter((item) => item.id === found.orderItem.id)
      .length,
    1,
  );
  if (found.orderItem.cancellationRequest !== null) {
    TestValidator.equals(
      "nested order item cancellation request points to the same live case",
      found.orderItem.cancellationRequest.id,
      found.id,
    );
    TestValidator.equals(
      "nested order item cancellation request reason matches live case",
      found.orderItem.cancellationRequest.reason,
      found.reason,
    );
    TestValidator.equals(
      "nested order item cancellation request status matches live case",
      found.orderItem.cancellationRequest.status,
      found.status,
    );
  }
  TestValidator.equals(
    "nested cancellation request identity remains unchanged after read",
    found.orderItem.cancellationRequest?.id ?? null,
    baselineNestedCancellationRequestId,
  );
}
