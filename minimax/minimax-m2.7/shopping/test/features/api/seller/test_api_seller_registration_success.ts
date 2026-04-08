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
 * Test successful seller registration with valid email and password meeting minimum requirements.
 *
 * Validates the seller registration endpoint by submitting a valid registration request with email,
 * password (minimum 8 characters), and session context fields. Verifies that the response correctly
 * indicates the seller is in 'pending' approval status and that no tokens are issued until email
 * verification is completed.
 *
 * The test ensures that:
 * 1. A new seller can register with valid credentials
 * 2. The seller account is created with 'pending' approval status
 * 3. No shop profile exists yet (null)
 * 4. No tokens are issued (email verification required)
 * 5. All required timestamps and IDs are properly formatted
 */
export async function test_api_seller_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate random email and password for seller registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // Minimum 8 characters
  // Register new seller
  const seller: IEcommerceMallSeller.IAuthorized =
    await api.functional.ecommerceMall.auth.seller.join(connection, {
      body: {
        email,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  // Validate response with typia.assert for complete runtime type validation
  typia.assert(seller);
  // Validate seller ID is a valid UUID format
  TestValidator.predicate(
    "seller id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      seller.id,
    ),
  );
  // Validate email matches submitted email
  TestValidator.equals("email matches input", seller.email, email);
  // Validate approval status is 'pending' for new registration
  TestValidator.equals(
    "approval status is pending",
    seller.approvalStatus,
    "pending",
  );
  // Validate shop profile is null (no shop created yet)
  TestValidator.equals("profile is null", seller.profile, null);
  // Validate rejection reason is null for new registration
  TestValidator.equals(
    "rejection reason is null",
    seller.rejectionReason,
    null,
  );
  // Validate rejected at is null for new registration
  TestValidator.equals("rejected at is null", seller.rejectedAt, null);
  // Validate seller approvals array is empty
  TestValidator.equals("seller approvals is empty", seller.sellerApprovals, []);
  // Validate seller suspensions array is empty
  TestValidator.equals(
    "seller suspensions is empty",
    seller.sellerSuspensions,
    [],
  );
  // Validate approval count is zero for new seller
  TestValidator.equals("approval count is zero", seller.approvalCount, 0);
  // Validate suspension count is zero for new seller
  TestValidator.equals("suspension count is zero", seller.suspensionCount, 0);
  // Validate createdAt is a valid timestamp
  TestValidator.predicate(
    "createdAt is valid ISO timestamp",
    !isNaN(Date.parse(seller.createdAt)),
  );
  // Validate updatedAt is a valid timestamp
  TestValidator.predicate(
    "updatedAt is valid ISO timestamp",
    !isNaN(Date.parse(seller.updatedAt)),
  );
  // Validate deletedAt is null for active seller
  TestValidator.equals("deletedAt is null", seller.deletedAt, null);
  // Validate token access is null (email verification required)
  TestValidator.equals("token access is null", seller.token.access, null);
  // Validate token refresh is null (email verification required)
  TestValidator.equals("token refresh is null", seller.token.refresh, null);
  // Validate token expired_at is a valid timestamp
  TestValidator.predicate(
    "token expired_at is valid",
    !isNaN(Date.parse(seller.token.expired_at)),
  );
  // Validate token refreshable_until is a valid timestamp
  TestValidator.predicate(
    "token refreshable_until is valid",
    !isNaN(Date.parse(seller.token.refreshable_until)),
  );
}
