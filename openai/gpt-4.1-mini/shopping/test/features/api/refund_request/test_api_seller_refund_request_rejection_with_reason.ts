import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_refund_requests_create_refund_request } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create_refund_request";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_seller_refund_request_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and join seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // Create customer connection and join customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuthorized);
  customerConnection.headers = {
    Authorization: customerAuthorized.token.access,
  };
  // Customer creates refund request
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create_refund_request(
      customerConnection,
      { body: {} },
    );
  typia.assert(refundRequest);
  // Assert refundRequest has id property and narrow it
  if (!("id" in refundRequest) || typeof refundRequest.id !== "string")
    throw new Error("refundRequest id property is missing or not string");
  const refundRequestId: string = refundRequest.id;
  // Seller rejects the refund request with a response reason
  const rejectBody: IShoppingMallRefundRequest.IApproveReject = {
    status: "rejected",
    sellerResponseReason: "The refund request is not valid.",
  };
  const rejectedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.approve_reject.approveRejectRefundRequest(
      sellerConnection,
      {
        refundRequestId,
        body: rejectBody,
      },
    );
  typia.assert(rejectedRefundRequest);
  // Authorization check: unauthorized sellers cannot reject (simulate unauthorized)
  const unauthorizedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error(
    "unauthorized seller cannot reject refund request",
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.approve_reject.approveRejectRefundRequest(
        unauthorizedSellerConnection,
        {
          refundRequestId,
          body: rejectBody,
        },
      );
    },
  );
}
