import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_refund_request_all_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // superAdminConnection.headers is now updated with access token
  // 2. Generate sample refund requests with typia.random()
  // Since no CREATE endpoint is available, we test retrieval with random IDs
  const sampleRefundRequests = ArrayUtil.repeat(3, () =>
    typia.random<IEcommerceMallRefundRequest>(),
  );
  // 3. Retrieve each refund request and validate structure
  for (const sampleRequest of sampleRefundRequests) {
    // Retrieve refund request by ID
    const retrievedRequest: IEcommerceMallRefundRequest =
      await api.functional.ecommerceMall.superAdmin.refund_requests.at(
        superAdminConnection,
        {
          refundRequestId: sampleRequest.id,
        },
      );
    typia.assert(retrievedRequest);
    // 4. Validate response structure and basic fields
    TestValidator.equals(
      "refund request id matches",
      retrievedRequest.id,
      sampleRequest.id,
    );
    // 5. Validate status-specific fields
    // decision_at is optional, rejection_reason is optional, seller_response is optional
    // We validate that when these fields exist, they have correct types
    TestValidator.equals(
      "decision_at is string or null",
      retrievedRequest.decisionAt === null ||
        (retrievedRequest.decisionAt !== null &&
          typeof retrievedRequest.decisionAt === "string"),
      true,
    );
    TestValidator.equals(
      "rejection_reason is string or null",
      retrievedRequest.rejectionReason === null ||
        (retrievedRequest.rejectionReason !== null &&
          typeof retrievedRequest.rejectionReason === "string"),
      true,
    );
    TestValidator.equals(
      "seller_response is string or null",
      retrievedRequest.sellerResponse === null ||
        (retrievedRequest.sellerResponse !== null &&
          typeof retrievedRequest.sellerResponse === "string"),
      true,
    );
    TestValidator.equals(
      "evidence_description is string or null",
      retrievedRequest.evidenceDescription === null ||
        (retrievedRequest.evidenceDescription !== null &&
          typeof retrievedRequest.evidenceDescription === "string"),
      true,
    );
    // 6. Validate required fields are populated
    TestValidator.equals(
      "delivery date is populated",
      retrievedRequest.deliveryDate !== null &&
        retrievedRequest.deliveryDate !== undefined,
      true,
    );
    TestValidator.equals(
      "created_at is populated",
      retrievedRequest.createdAt !== null &&
        retrievedRequest.createdAt !== undefined,
      true,
    );
    TestValidator.equals(
      "updated_at is populated",
      retrievedRequest.updatedAt !== null &&
        retrievedRequest.updatedAt !== undefined,
      true,
    );
  }
  // 7. Test that retrieving a non-existent refund request returns 404
  await TestValidator.httpError(
    "non-existent refund request returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.superAdmin.refund_requests.at(
        superAdminConnection,
        {
          refundRequestId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
