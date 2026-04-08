import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminRequest";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
 * Test administrator request retrieval with rejection details.
 *
 * Validates that an authenticated administrator can retrieve a rejected administrator access request with complete rejection information. The test ensures that all rejection-related fields are properly populated including the rejection reason, reviewing administrator details, and review timestamp.
 *
 * This test verifies the transparency requirement in the administrator approval workflow, ensuring that rejected applicants can view the rationale behind their rejection decision. The reviewing administrator information must be complete with id, email, and grade fields.
 *
 * Note: This test relies on simulation mode to generate a rejected request with proper rejection details. In production environment, a rejected request must exist in the database.
 *
 * 1. Authenticate as administrator using admin join endpoint.
 * 2. Retrieve a rejected admin request using the at endpoint with request ID.
 * 3. Validate response structure:
 *    - status equals 'rejected'
 *    - rejection_reason is non-null string
 *    - reviewed_by_id is non-null UUID
 *    - reviewed_at is non-null datetime
 *    - reviewingAdmin relation is non-null with complete summary
 * 4. Use typia.assert for complete type validation.
 * 5. Use TestValidator for business logic assertions on rejection details.
 */
export async function test_api_admin_request_retrieval_with_rejection_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerce.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(adminAuth);
  // 2. Retrieve a rejected admin request (simulation mode generates rejected request)
  const rejectedRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const request: IEcommerceAdminRequest =
    await api.functional.ecommerce.admin.requests.at(adminConnection, {
      requestId: rejectedRequestId,
    });
  typia.assert(request);
  // 3. Validate rejection details
  TestValidator.equals("status is rejected", request.status, "rejected");
  TestValidator.predicate(
    "rejection reason exists and is non-empty",
    request.rejection_reason !== null &&
      typeof request.rejection_reason === "string" &&
      request.rejection_reason.length > 0,
  );
  TestValidator.predicate(
    "reviewed_by_id exists",
    request.reviewed_by_id !== null,
  );
  TestValidator.predicate("reviewed_at exists", request.reviewed_at !== null);
  TestValidator.predicate(
    "reviewingAdmin relation exists",
    request.reviewingAdmin !== null,
  );
  // 4. Validate reviewing admin has required fields
  if (request.reviewingAdmin !== null) {
    TestValidator.predicate(
      "reviewing admin has valid id",
      typeof request.reviewingAdmin.id === "string" &&
        request.reviewingAdmin.id.length > 0,
    );
    TestValidator.predicate(
      "reviewing admin has valid email",
      typeof request.reviewingAdmin.email === "string" &&
        request.reviewingAdmin.email.length > 0,
    );
    TestValidator.predicate(
      "reviewing admin has valid grade",
      typeof request.reviewingAdmin.grade === "string" &&
        (request.reviewingAdmin.grade === "regular" ||
          request.reviewingAdmin.grade === "super"),
    );
  }
}
