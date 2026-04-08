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

export async function test_api_admin_request_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator retrieval of admin access request by ID.
   *
   * Validates that an authenticated administrator can successfully retrieve an administrator access request using its unique identifier. The test verifies the response includes all required fields from the IEcommerceAdminRequest type including requester information, approval status, and timestamps.
   *
   * Since admin request creation is not available through the provided SDK, this test uses simulation mode which generates random valid data via typia.random. The test validates the retrieval endpoint's response structure and type safety.
   *
   * 1. Administrator authenticates via join endpoint.
   * 2. Administrator retrieves admin request by UUID.
   * 3. Validates response conforms to IEcommerceAdminRequest structure.
   * 4. Verifies all required fields are present and properly typed.
   */
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve admin request by ID (simulation mode generates random valid data)
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const retrievedRequest = await api.functional.ecommerce.admin.requests.at(
    adminConnection,
    {
      requestId,
    },
  );
  typia.assert(retrievedRequest);
  // 3. Validate response structure
  TestValidator.predicate(
    "reason is non-empty",
    retrievedRequest.reason.length > 0,
  );
  TestValidator.predicate(
    "status is valid",
    retrievedRequest.status === "pending" ||
      retrievedRequest.status === "approved" ||
      retrievedRequest.status === "rejected",
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      retrievedRequest.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      retrievedRequest.updated_at,
    ),
  );
  // 4. Validate nullable fields based on status
  if (retrievedRequest.status === "pending") {
    TestValidator.predicate(
      "reviewed_by_id is null for pending",
      retrievedRequest.reviewed_by_id === null,
    );
    TestValidator.predicate(
      "reviewed_at is null for pending",
      retrievedRequest.reviewed_at === null,
    );
    TestValidator.predicate(
      "rejection_reason is null for pending",
      retrievedRequest.rejection_reason === null,
    );
  }
  // 5. Validate requester relation exists
  if (retrievedRequest.requester_type === "customer") {
    TestValidator.predicate(
      "requester_customer_id is populated for customer",
      retrievedRequest.requester_customer_id !== null,
    );
    TestValidator.predicate(
      "requester_seller_id is null for customer",
      retrievedRequest.requester_seller_id === null,
    );
    TestValidator.predicate(
      "requestingCustomer is populated",
      retrievedRequest.requestingCustomer !== null,
    );
  } else if (retrievedRequest.requester_type === "seller") {
    TestValidator.predicate(
      "requester_seller_id is populated for seller",
      retrievedRequest.requester_seller_id !== null,
    );
    TestValidator.predicate(
      "requester_customer_id is null for seller",
      retrievedRequest.requester_customer_id === null,
    );
    TestValidator.predicate(
      "requestingSeller is populated",
      retrievedRequest.requestingSeller !== null,
    );
  }
}
