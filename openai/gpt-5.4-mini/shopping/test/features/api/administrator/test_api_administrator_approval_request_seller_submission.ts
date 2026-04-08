import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
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
import { generate_random_mall_platform_customer_approval_requests_create } from "../../../generate/generate_random_mall_platform_customer_approval_requests_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

/**
 * Test seller submission of an administrator approval request.
 *
 * Validates that an authenticated seller can request administrator access with a business justification and receive a pending approval request record. The test ensures the created request is associated with the submitting seller account and preserves the submitted reason while leaving review-related fields unset.
 *
 * Special attention is given to the seller authentication flow, the request ownership linkage, and the initial workflow state. The response must show that the request is pending, has no reviewer assigned yet, and carries no rejection or review timestamp data at submission time.
 *
 * 1. Register and authenticate a seller account using isolated seller connection state.
 * 2. Submit an administrator approval request with a valid business reason.
 * 3. Validate the returned request record matches the seller submission context and initial pending state.
 */
export async function test_api_administrator_approval_request_seller_submission(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const sellerPassword = "1234";
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const request =
    await api.functional.mallPlatform.customer.approvalRequests.create(
      sellerConnection,
      {
        body: {
          reason,
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(request);
  TestValidator.equals("approval request reason", request.reason, reason);
  TestValidator.equals("approval request status", request.status, "pending");
  TestValidator.equals(
    "request reviewer is not assigned",
    request.reviewerAdministrator,
    null,
  );
  TestValidator.equals(
    "request rejection reason is not set",
    request.rejectionReason,
    null,
  );
  TestValidator.equals(
    "request review timestamp is not set",
    request.reviewedAt,
    null,
  );
  TestValidator.equals(
    "request deletion timestamp is not set",
    request.deletedAt,
    null,
  );
}
