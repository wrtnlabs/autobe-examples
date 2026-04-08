import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller can retrieve their pending approval request status.
 *
 * Validates that a newly registered seller can successfully retrieve their seller registration approval request while it remains in pending status. The test verifies the complete approval record structure including seller reference, status, timestamps, and administrator review fields.
 *
 * The workflow ensures that sellers can check their approval status and understand they are awaiting administrator review before gaining full selling privileges.
 *
 * 1. Register a new seller account with randomized credentials.
 * 2. Create seller-specific connection with authentication token.
 * 3. Retrieve approval request using the seller ID as approval ID.
 * 4. Validate approval record structure and pending status.
 * 5. Verify timestamps and null review fields for unreviewed status.
 */
export async function test_api_seller_approval_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve approval request using seller ID as approval ID
  // The approval record has 1:1 relationship with seller (unique constraint on seller_id)
  const approval = await api.functional.ecommerce.seller.approvals.at(
    sellerConnection,
    {
      approvalId: authorized.id satisfies string & tags.Format<"uuid">,
    },
  );
  typia.assert(approval);
  // 3. Validate approval record structure
  TestValidator.equals("status is pending", approval.status, "pending");
  // 4. Verify seller reference
  TestValidator.predicate(
    "seller shop name exists",
    approval.seller.shop_name.length > 0,
  );
  TestValidator.equals(
    "seller approval status matches",
    approval.seller.approval_status,
    "pending",
  );
  // 5. Verify null review fields for pending status
  TestValidator.equals("reviewedAt is null", approval.reviewedAt, null);
  TestValidator.equals(
    "reviewedByAdmin is null",
    approval.reviewedByAdmin,
    null,
  );
  TestValidator.equals(
    "rejectionReason is null",
    approval.rejectionReason,
    null,
  );
}
