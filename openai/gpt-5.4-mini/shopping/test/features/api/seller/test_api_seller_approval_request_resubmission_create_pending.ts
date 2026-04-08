import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_approval_requests_resubmissions_create } from "../../../generate/generate_random_mall_platform_seller_approval_requests_resubmissions_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

export async function test_api_seller_approval_request_resubmission_create_pending(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller approval request resubmission creation in pending state.
   *
   * This scenario validates the end-to-end flow for a seller submitting a new
   * administrator approval request resubmission after authentication. It checks
   * that the API creates a fresh pending governance record, preserves applicant
   * association, stores the submitted reason verbatim, and leaves reviewer
   * metadata unset for a newly created request.
   *
   * 1. Register a fresh seller account and obtain an authenticated seller session.
   * 2. Submit a new administrator approval request resubmission using the seller session.
   * 3. Verify the created request is pending, linked to the seller, and has no reviewer assigned.
   * 4. Confirm the returned record preserves the submitted reason and contains creation metadata.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const request =
    await api.functional.mallPlatform.seller.approvalRequests.resubmissions.create(
      sellerConnection,
      {
        body: {
          reason,
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(request);
  TestValidator.equals(
    "resubmission reason should match input",
    request.reason,
    reason,
  );
  TestValidator.equals(
    "request status should be pending",
    request.status,
    "pending",
  );
  TestValidator.equals(
    "request should be associated with the authenticated seller applicant",
    request.administrator.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "request should not have reviewer assigned yet",
    request.reviewerAdministrator,
    null,
  );
  TestValidator.equals(
    "request should not have a rejection reason",
    request.rejectionReason,
    null,
  );
  TestValidator.equals(
    "request should not be reviewed yet",
    request.reviewedAt,
    null,
  );
  TestValidator.equals(
    "request should preserve active lifecycle state",
    request.deletedAt,
    null,
  );
  TestValidator.predicate(
    "created timestamp should exist",
    request.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp should exist",
    request.updatedAt.length > 0,
  );
}
