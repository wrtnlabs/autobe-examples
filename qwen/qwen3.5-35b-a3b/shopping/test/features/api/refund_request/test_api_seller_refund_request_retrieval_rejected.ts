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

export async function test_api_seller_refund_request_retrieval_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://seller.example.com/join",
      referrer: "https://example.com/seller-portal",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Generate a refund request ID (assumed to exist in test database)
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Reject the refund request with a detailed rejection reason
  const rejectionReason = typia.random<
    string & tags.MinLength<10> & tags.MaxLength<500>
  >();
  const rejectedRequest =
    await api.functional.ecommerceMall.seller.refund_requests.reject(
      sellerConnection,
      {
        refundRequestId,
        body: {
          rejection_reason: rejectionReason,
        } satisfies IEcommerceMallRefundRequest.IReject,
      },
    );
  typia.assert(rejectedRequest);
  // 4. Retrieve the rejected refund request
  const retrievedRequest =
    await api.functional.ecommerceMall.seller.refund_requests.at(
      sellerConnection,
      { refundRequestId },
    );
  typia.assert(retrievedRequest);
  // 5. Validate rejection status
  TestValidator.equals(
    "refund request status is rejected",
    retrievedRequest.status,
    "rejected",
  );
  // 6. Validate rejection reason is populated
  TestValidator.equals(
    "rejection reason is not null",
    retrievedRequest.rejectionReason !== null,
    true,
  );
  TestValidator.equals(
    "rejection reason matches input",
    retrievedRequest.rejectionReason,
    rejectionReason,
  );
  // 7. Validate decision_at timestamp is set
  TestValidator.equals(
    "decision_at is not null",
    retrievedRequest.decisionAt !== null,
    true,
  );
  // 8. Validate seller_response equals rejection_reason for rejection
  TestValidator.equals(
    "seller_response equals rejection_reason",
    retrievedRequest.sellerResponse,
    rejectionReason,
  );
  // 9. Validate order item status remains delivered
  TestValidator.equals(
    "order item status is delivered",
    retrievedRequest.orderItem.status,
    "delivered",
  );
  // 10. Validate customer information is present
  TestValidator.equals(
    "customer exists",
    retrievedRequest.customer.id !== undefined,
    true,
  );
  // 11. Validate refund code exists
  TestValidator.equals(
    "refund code exists",
    retrievedRequest.refundCode.length > 0,
    true,
  );
  // 12. Validate evidence description can be null or string
  TestValidator.equals(
    "evidence_description is null or string",
    retrievedRequest.evidenceDescription === null ||
      typeof retrievedRequest.evidenceDescription === "string",
    true,
  );
  // 13. Validate original customer reason is preserved
  TestValidator.predicate(
    "customer reason is preserved",
    () => retrievedRequest.reason.length > 0,
  );
  // 14. Validate timestamps exist
  TestValidator.predicate(
    "created_at timestamp exists",
    () => retrievedRequest.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    () => retrievedRequest.updatedAt !== undefined,
  );
  // 15. Validate submitted_at and processed_at can be null or set
  TestValidator.predicate(
    "submitted_at or processed_at exists",
    () =>
      retrievedRequest.submittedAt !== null ||
      retrievedRequest.processedAt !== null,
  );
}
