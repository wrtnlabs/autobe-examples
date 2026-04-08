import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test rejection reason retrieval for a pending seller.
 *
 * Validates the behavior when a seller with pending approval status calls the
 * rejection-reason endpoint. A pending seller has not been rejected by an
 * administrator, so the response should contain null values for both rejectionReason
 * and rejectedAt fields.
 *
 * This test ensures that:
 * 1. Pending sellers can successfully call the rejection-reason endpoint
 * 2. The API returns null values when no rejection has occurred
 * 3. The response type is correctly validated by typia.assert()
 *
 * Flow:
 * 1. Register a new seller account (starts with pending status)
 * 2. Create authenticated connection with seller token
 * 3. Call GET /ecommerceMall/seller/seller/rejection-reason
 * 4. Validate response contains null values for rejection fields
 */
export async function test_api_seller_rejection_reason_retrieval_for_pending_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new seller account with pending status using utility function
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Verify the seller has pending approval status
  TestValidator.equals(
    "approval status is pending",
    sellerJoinResult.approvalStatus,
    "pending",
  );
  // 2. Create authenticated connection for the seller
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = sellerJoinResult.token.access;
  // 3. Call the rejection-reason endpoint
  const rejectionReasonResponse =
    await api.functional.ecommerceMall.seller.seller.rejection_reason.rejectionReason(
      sellerConnection,
    );
  typia.assert(rejectionReasonResponse);
  // 4. Validate response - pending sellers should have null values
  TestValidator.equals(
    "rejectionReason is null for pending seller",
    rejectionReasonResponse.rejectionReason,
    null,
  );
  TestValidator.equals(
    "rejectedAt is null for pending seller",
    rejectionReasonResponse.rejectedAt,
    null,
  );
}
