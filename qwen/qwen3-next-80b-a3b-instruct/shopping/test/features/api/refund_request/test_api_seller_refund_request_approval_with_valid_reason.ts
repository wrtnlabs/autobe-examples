import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundResponseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundResponseSnapshot";
import type { IShoppingMallRequestResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestResponse";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_refund_request_approval_with_valid_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // 2. Set up customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection.headers = {
    Authorization: customerAuthorized.token.access,
  };
  // 3. Create a refund request as customer
  // IShoppingMallRefundRequest is empty ({}), so body must be empty
  const refundRequest =
    await api.functional.shoppingMall.customer.refund_requests.create(
      customerConnection,
      {
        body: {} satisfies IShoppingMallRefundRequest,
      },
    );
  // Assert the actual API return type, which includes 'id'
  const validatedRefundRequest = typia.assert<{ id: string }>(refundRequest);
  const requestId = validatedRefundRequest.id;
  // 4. Create shipment as seller to transition order to 'delivered' status
  // We need an order_item_id, but we don't have it from refundRequest since DTO is empty.
  // We must generate a random UUID for order_item_id
  // Note: API documentation says this endpoint requires order_item_id to be a valid ID from an order item with status 'delivered'
  const randomOrderId = typia.random<string & tags.Format<"uuid">>();
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      orderItemId: randomOrderId,
      body: {} satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 5. Seller approves refund request with valid reason
  const approvalReason = RandomGenerator.paragraph({ sentences: 10 });
  const refundResponseSnapshot =
    await api.functional.shoppingMall.seller.refund_requests.response.approveRefund(
      sellerConnection,
      {
        requestId,
        body: {
          decision: "approve",
          reason: approvalReason,
        } satisfies IShoppingMallRequestResponse,
      },
    );
  // Assert the actual API return type, which includes 'decision' and 'reason'
  const validatedRefundResponseSnapshot = typia.assert<{ decision: string; reason: string }>(refundResponseSnapshot);
  // 6. Verify decision and reason are preserved in response
  TestValidator.equals(
    "decision matches",
    validatedRefundResponseSnapshot.decision,
    "approve",
  );
  TestValidator.equals(
    "reason matches",
    validatedRefundResponseSnapshot.reason,
    approvalReason,
  );
  TestValidator.predicate(
    "reason length valid",
    approvalReason.length >= 10 && approvalReason.length <= 500,
  );
}