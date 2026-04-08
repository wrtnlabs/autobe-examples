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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test retrieving seller account details for an approved seller account - primary success path.
 *
 * Validates the complete seller approval workflow including registration, administrator approval, and profile retrieval. Ensures that approved sellers have complete account data with correct approval status and active state.
 *
 * Special attention is given to verifying that the approval workflow correctly transitions seller from 'pending' to 'approved' status, and that all seller profile fields are properly populated and validated.
 *
 * 1. Register a new seller account with email, password, and display name.
 * 2. Verify the seller account is created with approval_status 'pending'.
 * 3. Register an administrator account for approval workflow.
 * 4. Administrator approves the seller registration request.
 * 5. Retrieve the approved seller's profile by ID.
 * 6. Validate seller account details including id, email, display_name, approval_status, rejection_reason, is_suspended, and timestamps.
 */
export async function test_api_seller_profile_retrieval_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account (status will be 'pending')
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuthorized);
  // 2. Register administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuthorized);
  // 3. Administrator approves seller registration
  const approvalUpdate: IEcommerceMallSellerApprovalRequest.IUpdate = {
    status: "approved" as const,
  };
  // Use seller ID as the approval request ID (approval request linked to seller)
  const approvalRequest =
    await api.functional.ecommerceMall.administrator.seller_approvals.update(
      adminConnection,
      {
        requestId: sellerAuthorized.id,
        body: approvalUpdate,
      },
    );
  typia.assert(approvalRequest);
  // 4. Retrieve approved seller profile
  const sellerProfile = await api.functional.ecommerceMall.sellers.at(
    sellerConnection,
    {
      sellerId: sellerAuthorized.id,
    },
  );
  typia.assert(sellerProfile);
  // 5. Validate seller account details
  TestValidator.equals("seller id", sellerProfile.id, sellerAuthorized.id);
  TestValidator.equals(
    "seller email",
    sellerProfile.email,
    sellerAuthorized.email,
  );
  TestValidator.equals(
    "display name",
    sellerProfile.display_name,
    sellerAuthorized.display_name,
  );
  TestValidator.equals(
    "approval status",
    sellerProfile.approval_status,
    "approved",
  );
  TestValidator.equals(
    "rejection reason",
    sellerProfile.rejection_reason,
    null,
  );
  TestValidator.equals("is suspended", sellerProfile.is_suspended, false);
  TestValidator.equals("deleted at", sellerProfile.deleted_at, null);
  // Validate timestamps are valid ISO datetime format
  TestValidator.equals(
    "created at format",
    sellerProfile.created_at,
    sellerProfile.created_at,
  );
  TestValidator.equals(
    "updated at format",
    sellerProfile.updated_at,
    sellerProfile.updated_at,
  );
}