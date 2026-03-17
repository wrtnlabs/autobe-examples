import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refund_request_retrieval_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Create a new connection with seller token for subsequent API calls
  const sellerApiConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerAuth.token.access },
  };
  // 2. Generate a refund request (customer endpoint not available, use random)
  const refundRequest = typia.random<IEcommerceMallRefundRequest>();
  typia.assert(refundRequest);
  // 3. Approve the refund request
  const approvedRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerApiConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          action: "approve",
        } satisfies IEcommerceMallRefundRequest.IApproval,
      },
    );
  typia.assert(approvedRefundRequest);
  // 4. Retrieve the approved refund request
  const retrievedRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.at(
      sellerApiConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // 5. Validate approved refund request details
  TestValidator.equals(
    "refund request status is approved",
    retrievedRefundRequest.status,
    "approved",
  );
  TestValidator.equals(
    "order item status is refunded",
    retrievedRefundRequest.orderItem.status,
    "refunded",
  );
  TestValidator.predicate(
    "decision_at is set after approval",
    retrievedRefundRequest.decisionAt !== null,
  );
  TestValidator.predicate(
    "processed_at is set after approval",
    retrievedRefundRequest.processedAt !== null,
  );
  TestValidator.predicate(
    "seller_response is populated after approval",
    retrievedRefundRequest.sellerResponse !== null,
  );
  TestValidator.predicate(
    "refundCode exists in approved request",
    retrievedRefundRequest.refundCode !== null,
  );
}
