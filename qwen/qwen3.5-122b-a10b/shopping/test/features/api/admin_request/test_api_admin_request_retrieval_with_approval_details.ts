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
 * Test administrator retrieval of an approved admin access request with complete review details.
 *
 * Validates that an authenticated administrator can successfully retrieve an administrator access request that has been approved by a super administrator. The response includes all fields with the status set to 'approved', and the reviewed_by_id and reviewed_at fields are populated showing which administrator reviewed the request and when.
 *
 * The reviewingAdmin relation contains the summary of the administrator who performed the approval, and the rejection_reason is null since the request was approved. This validates the audit trail functionality for administrator access requests, ensuring transparency in the approval workflow.
 *
 * 1. Authenticate as administrator using admin join.
 * 2. Generate a random request ID for retrieval.
 * 3. Retrieve the request using the at endpoint.
 * 4. Validate status equals 'approved'.
 * 5. Validate reviewed_by_id and reviewed_at are populated.
 * 6. Validate reviewingAdmin relation exists with summary data.
 * 7. Validate rejection_reason is null.
 * 8. Validate requester_type is either 'customer' or 'seller'.
 * 9. Validate requester information matches requester_type.
 * 10. Validate reviewingAdmin has required summary fields.
 *
 * Note: This test uses simulation mode for request generation since no approval endpoint is available in the current SDK. In production E2E tests, an admin request would need to be created and approved through the approval workflow before retrieval.
 */
export async function test_api_admin_request_retrieval_with_approval_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate a random request ID for retrieval
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the request
  const retrievedRequest: IEcommerceAdminRequest =
    await api.functional.ecommerce.admin.requests.at(adminConnection, {
      requestId,
    });
  typia.assert(retrievedRequest);
  // 4. Validate status equals 'approved'
  TestValidator.equals("request status", retrievedRequest.status, "approved");
  // 5. Validate reviewed_by_id is populated (non-null)
  TestValidator.predicate(
    "reviewed_by_id is populated",
    retrievedRequest.reviewed_by_id !== null &&
      retrievedRequest.reviewed_by_id !== undefined,
  );
  // 6. Validate reviewed_at is populated (non-null)
  TestValidator.predicate(
    "reviewed_at is populated",
    retrievedRequest.reviewed_at !== null &&
      retrievedRequest.reviewed_at !== undefined,
  );
  // 7. Validate reviewingAdmin relation exists
  TestValidator.predicate(
    "reviewingAdmin relation exists",
    retrievedRequest.reviewingAdmin !== null &&
      retrievedRequest.reviewingAdmin !== undefined,
  );
  // 8. Validate rejection_reason is null
  TestValidator.equals(
    "rejection_reason is null",
    retrievedRequest.rejection_reason,
    null,
  );
  // 9. Validate requester_type is either 'customer' or 'seller'
  TestValidator.predicate(
    "requester_type is valid",
    retrievedRequest.requester_type === "customer" ||
      retrievedRequest.requester_type === "seller",
  );
  // 10. Validate requester information matches requester_type
  if (retrievedRequest.requester_type === "customer") {
    TestValidator.predicate(
      "requestingCustomer exists for customer requester",
      retrievedRequest.requestingCustomer !== null &&
        retrievedRequest.requestingCustomer !== undefined,
    );
    TestValidator.predicate(
      "requestingSeller is null for customer requester",
      retrievedRequest.requestingSeller === null ||
        retrievedRequest.requestingSeller === undefined,
    );
  } else if (retrievedRequest.requester_type === "seller") {
    TestValidator.predicate(
      "requestingSeller exists for seller requester",
      retrievedRequest.requestingSeller !== null &&
        retrievedRequest.requestingSeller !== undefined,
    );
    TestValidator.predicate(
      "requestingCustomer is null for seller requester",
      retrievedRequest.requestingCustomer === null ||
        retrievedRequest.requestingCustomer === undefined,
    );
  }
  // 11. Validate reviewingAdmin has required summary fields
  if (retrievedRequest.reviewingAdmin) {
    typia.assert(retrievedRequest.reviewingAdmin);
    TestValidator.predicate(
      "reviewingAdmin has valid id",
      retrievedRequest.reviewingAdmin.id !== null &&
        retrievedRequest.reviewingAdmin.id !== undefined,
    );
    TestValidator.predicate(
      "reviewingAdmin has valid email",
      retrievedRequest.reviewingAdmin.email !== null &&
        retrievedRequest.reviewingAdmin.email !== undefined,
    );
    TestValidator.predicate(
      "reviewingAdmin has valid grade",
      retrievedRequest.reviewingAdmin.grade !== null &&
        retrievedRequest.reviewingAdmin.grade !== undefined,
    );
  }
}
