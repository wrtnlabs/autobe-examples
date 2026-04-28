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
 * Test retrieving an administrator promotion request by ID to verify complete request details are returned.
 *
 * Validates that the admin endpoint returns comprehensive promotion request information including the applicant's written justification, actor type (customer or seller), and current lifecycle status. When the request is in pending status, review-specific fields (reviewedByAdmin, reviewedAt, rejectionReason) must be null since no super administrator has processed the request yet.
 *
 * This test ensures administrators can view original applicant data and confirms that review fields are properly null until a super administrator processes the promotion request.
 *
 * 1. Authenticate an administrator account using the join utility.
 * 2. Generate a random request ID for the promotion request retrieval.
 * 3. Retrieve the promotion request details using the admin connection.
 * 4. Validate response structure with typia.assert().
 * 5. Verify essential applicant fields (reason, actorType) exist.
 * 6. For pending requests, confirm review fields are null.
 */
export async function test_api_administrator_promotion_request_pending_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Generate random request ID
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve promotion request details
  const request =
    await api.functional.ecommercePlatform.admin.administrator_promotion_requests.at(
      adminConnection,
      { requestId },
    );
  // 4. Validate complete response structure
  typia.assert(request);
  // 5. Validate essential applicant fields exist
  TestValidator.predicate(
    "has written justification",
    request.reason.length > 0,
  );
  TestValidator.predicate("has actor type", request.actorType.length > 0);
  // 6. For pending requests, validate null review fields
  if (request.status === "pending") {
    TestValidator.equals(
      "reviewedByAdmin is null for pending",
      request.reviewedByAdmin,
      null,
    );
    TestValidator.equals(
      "reviewedAt is null for pending",
      request.reviewedAt,
      null,
    );
    TestValidator.equals(
      "rejectionReason is null for pending",
      request.rejectionReason,
      null,
    );
  }
}
