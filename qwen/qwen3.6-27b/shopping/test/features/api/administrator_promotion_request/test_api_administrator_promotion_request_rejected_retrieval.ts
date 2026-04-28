import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Verify retrieval of a rejected administrator promotion request with complete rejection audit trail.
 *
 * Validates that querying a rejected promotion request (status=rejected) returns all necessary audit fields for compliance purposes: the original applicant justification (reason), the reviewing super administrator identity (reviewedByAdmin), the review timestamp (reviewedAt), and the rejection explanation provided by the reviewer (rejectionReason).
 *
 * This test ensures that rejection decisions preserve the decision rationale, enabling proper audit trails for administrative access control workflows. All rejection-related fields are properly populated when a super administrator rejects an application.
 *
 * 1. Register a new administrator account for test authentication.
 * 2. Retrieve an administrator promotion request by its unique identifier.
 * 3. Validate that the response structure is correctly typed.
 * 4. Assert that rejection-specific fields (status, rejectionReason, reviewedByAdmin, reviewedAt) are properly populated.
 * 5. Verify the applicant's original justification field (reason) exists.
 */
export async function test_api_administrator_promotion_request_rejected_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Retrieve a promotion request to test rejection field validation
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const request =
    await api.functional.ecommercePlatform.admin.administrator_promotion_requests.at(
      adminConnection,
      { requestId },
    );
  typia.assert(request);
  // 3. Validate rejection-specific audit trail fields
  TestValidator.equals("status is rejected", request.status, "rejected");
  TestValidator.predicate(
    "rejection reason is populated",
    request.rejectionReason !== null,
  );
  TestValidator.predicate(
    "reviewedByAdmin contains reviewer identity",
    request.reviewedByAdmin !== null,
  );
  TestValidator.predicate(
    "reviewedAt has review timestamp",
    request.reviewedAt !== null,
  );
  TestValidator.predicate("applicant reason exists", request.reason.length > 0);
}
