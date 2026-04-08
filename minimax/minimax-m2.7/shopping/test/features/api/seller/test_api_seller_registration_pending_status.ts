import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
 * Test that newly registered seller account has 'pending' approval status.
 *
 * Validates the seller registration workflow by confirming that a newly registered
 * seller account enters a pending approval state. This ensures sellers cannot
 * immediately start listing products or accessing seller-specific endpoints until
 * an administrator reviews and approves their registration.
 *
 * The test verifies:
 * 1. The seller account is created with 'pending' approval status
 * 2. The seller is in 'active' suspension state (not suspended)
 * 3. Rejection-related fields are null (no rejection occurred)
 * 4. The account is not deleted
 * 5. Authorization tokens are null (email verification required before login)
 *
 * These validations confirm that the platform enforces an approval workflow
 * for new sellers, requiring administrative review before sellers can operate.
 */
export async function test_api_seller_registration_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // Register a new seller with unique email and valid credentials
  const seller: IEcommerceMallSeller.IAuthorized =
    await api.functional.ecommerceMall.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(seller);
  // Validate approval status is 'pending' - seller cannot sell until approved
  TestValidator.equals(
    "approval status is pending",
    seller.approvalStatus,
    "pending",
  );
  // Validate suspension status is 'active' - seller is not suspended
  TestValidator.equals(
    "suspension status is active",
    seller.profile.seller.suspensionStatus,
    "active",
  );
  // Validate rejection fields are null - no rejection has occurred
  TestValidator.equals(
    "rejection reason is null",
    seller.rejectionReason,
    null,
  );
  TestValidator.equals("rejected at is null", seller.rejectedAt, null);
  // Validate deleted at is null - account is active
  TestValidator.equals("deleted at is null", seller.deletedAt, null);
  // Validate tokens are null - email verification required before login
  TestValidator.equals(
    "access token is null (email verification required)",
    seller.token.access,
    null,
  );
  TestValidator.equals(
    "refresh token is null (email verification required)",
    seller.token.refresh,
    null,
  );
}