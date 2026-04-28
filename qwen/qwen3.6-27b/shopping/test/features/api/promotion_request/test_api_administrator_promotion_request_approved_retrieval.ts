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
 * Test retrieving an approved administrator promotion request to verify audit trail completeness after super administrator approval.
 *
 * Validates that when querying an approved request (status='approved'), the response includes the original applicant justification (reason), the super administrator who reviewed (reviewedByAdmin contains the admin identity), the review timestamp (reviewedAt has a timestamp), and rejectionReason is null since the request was approved. This test ensures the approval lifecycle transition is properly recorded with full audit information.
 *
 * 1. Administrator authenticates using join endpoint.
 * 2. Administrator retrieves an existing promotion request by UUID.
 * 3. Validates the response is properly typed and contains all audit trail fields.
 * 4. Verifies status is 'approved', reviewedByAdmin is populated, reviewedAt is populated, and rejectionReason is null.
 */
export async function test_api_administrator_promotion_request_approved_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  // 2. Retrieve an approved promotion request using its UUID
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const request =
    await api.functional.ecommercePlatform.admin.administrator_promotion_requests.at(
      adminConnection,
      {
        requestId,
      },
    );
  typia.assert(request);
  // 3. Validate the response contains audit trail completeness
  TestValidator.equals("request id matches", request.id, requestId);
  TestValidator.equals("status is approved", request.status, "approved");
  TestValidator.predicate(
    "reason is present",
    request.reason !== "" && typeof request.reason === "string",
  );
  TestValidator.predicate(
    "reviewedByAdmin is populated",
    request.reviewedByAdmin !== null,
  );
  typia.assertGuard(request.reviewedByAdmin!);
  TestValidator.predicate(
    "reviewedAt is populated",
    request.reviewedAt !== null,
  );
  TestValidator.equals(
    "rejectionReason is null for approved request",
    request.rejectionReason,
    null,
  );
  TestValidator.predicate(
    "createdAt is valid date-time",
    typeof request.createdAt === "string" && request.createdAt.includes("T"),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    typeof request.updatedAt === "string" && request.updatedAt.includes("T"),
  );
  TestValidator.equals(
    "actor_type is customer or seller",
    request.actorType === "customer" || request.actorType === "seller",
    true,
  );
}
