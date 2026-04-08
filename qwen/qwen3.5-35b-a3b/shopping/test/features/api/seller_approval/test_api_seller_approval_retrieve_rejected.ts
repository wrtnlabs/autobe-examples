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

export async function test_api_seller_approval_retrieve_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // Update connection headers with admin token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // 2. Generate simulated rejected approval request data
  const approvalId = typia.random<string & tags.Format<"uuid">>();
  const rejectedApproval = typia.random<IEcommerceMallSellerApprovalRequest>();
  // 3. Retrieve the approval request
  const retrievedApproval =
    await api.functional.ecommerceMall.administrator.seller_approvals.at(
      adminConnection,
      {
        requestId: approvalId,
      },
    );
  typia.assert(retrievedApproval);
  // 4. Validate basic structure
  TestValidator.equals("approval ID matches", retrievedApproval.id, approvalId);
  TestValidator.equals(
    "status is rejected",
    retrievedApproval.status,
    "rejected",
  );
  // 5. Validate seller information
  const seller = retrievedApproval.seller;
  typia.assert(seller);
  TestValidator.equals(
    "seller ID is UUID",
    seller.id,
    typia.assert<string & tags.Format<"uuid">>(seller.id),
  );
  TestValidator.equals(
    "seller display name is string",
    seller.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "seller approval status is rejected",
    seller.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "seller is suspended is boolean",
    typeof seller.is_suspended,
    "boolean",
  );
  typia.assert(seller.created_at);
  // Validate seller email if present
  if (seller.email) {
    typia.assert(seller.email);
  }
  // Validate rejection reason is present and not null for rejected status
  TestValidator.equals(
    "rejection reason is not null",
    retrievedApproval.rejectionReason !== null,
    true,
  );
  typia.assert(retrievedApproval.rejectionReason!);
  // 6. Validate reviewer information (must be present for rejected status)
  const reviewer = typia.assert<NonNullable<typeof retrievedApproval.reviewer>>(retrievedApproval.reviewer);
  TestValidator.equals(
    "reviewer ID is UUID",
    reviewer.id,
    typia.assert<string & tags.Format<"uuid">>(reviewer.id),
  );
  TestValidator.equals(
    "reviewer display name is string",
    reviewer.displayName.length > 0,
    true,
  );
  typia.assert(reviewer.email);
  TestValidator.equals(
    "reviewer is banned is boolean",
    typeof reviewer.isBanned,
    "boolean",
  );
  typia.assert(reviewer.createdAt);
  typia.assert(reviewer.updatedAt);
  TestValidator.equals(
    "reviewer deleted_at is nullable",
    reviewer.deletedAt === null || typeof reviewer.deletedAt === "string",
    true,
  );
  // 7. Validate request reason
  TestValidator.equals(
    "request reason is non-empty",
    retrievedApproval.requestReason.length > 0,
    true,
  );
  typia.assert(retrievedApproval.requestReason);
  // 8. Validate timestamps (already validated by typia.assert above)
  typia.assert(retrievedApproval.createdAt);
  typia.assert(retrievedApproval.updatedAt);
  // 9. Verify deleted_at is null for active record
  TestValidator.equals("deleted_at is null", retrievedApproval.deletedAt, null);
}