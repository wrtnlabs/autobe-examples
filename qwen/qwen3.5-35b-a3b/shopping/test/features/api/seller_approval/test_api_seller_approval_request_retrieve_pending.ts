import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test retrieving a pending seller approval request as an administrator.
 *
 * Validates the retrieval of a pending seller approval request by an administrator. The test registers a new administrator account, authenticates as admin, and retrieves the approval request using the administrator's access token. Since there is no API to create sellers or approval requests, the test uses the SDK's simulation mode where typia.random() generates realistic mock data for both the request and response. This validates the primary use case of an administrator viewing pending seller registration requests in the approval workflow.
 *
 * The test verifies that the response includes all required fields: seller information (id, email, display_name, approval_status), the request status is 'pending', the request reason is included, and the reviewer field is null since no administrator has reviewed the request yet. This ensures the API correctly returns pending approval requests with complete seller details and proper null values for unreviewed requests.
 *
 * 1. Administrator registration with display_name, email, and password.
 * 2. Administrator authentication to obtain access token.
 * 3. Create admin-specific connection with access token.
 * 4. Retrieve pending seller approval request by ID.
 * 5. Validate response structure with seller information.
 * 6. Verify status is 'pending' and reviewer is null.
 * 7. Validate request reason is included in response.
 */
export async function test_api_seller_approval_request_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: {
        display_name: RandomGenerator.name(3),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        grade: "regular" as const,
      } satisfies IEcommerceMallAdministrator.IJoin,
    },
  );
  typia.assert(adminAuthorized);
  // 2. Create admin connection with token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuthorized.token.access },
  };
  // 3. Retrieve pending seller approval request using simulation mode
  const pendingRequestConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  const approvalRequest: IEcommerceMallSellerApprovalRequest =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.at(
      pendingRequestConnection,
      {
        requestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(approvalRequest);
  // 4. Validate response structure - status is pending
  TestValidator.equals(
    "approval request status is pending",
    approvalRequest.status,
    "pending",
  );
  // 5. Validate reviewer is null for pending request
  TestValidator.equals(
    "reviewer is null for pending request",
    approvalRequest.reviewer,
    null,
  );
  // 6. Validate request reason is included
  TestValidator.predicate(
    "request reason is included",
    approvalRequest.requestReason !== null &&
      approvalRequest.requestReason !== undefined,
  );
  // 7. Validate seller information is complete
  typia.assert(approvalRequest.seller);
  TestValidator.equals(
    "seller id is present",
    approvalRequest.seller.id,
    approvalRequest.seller.id,
  );
  TestValidator.equals(
    "seller display_name is present",
    approvalRequest.seller.display_name,
    approvalRequest.seller.display_name,
  );
  TestValidator.equals(
    "seller email is present",
    approvalRequest.seller.email,
    approvalRequest.seller.email,
  );
  TestValidator.equals(
    "seller approval_status is present",
    approvalRequest.seller.approval_status,
    approvalRequest.seller.approval_status,
  );
}