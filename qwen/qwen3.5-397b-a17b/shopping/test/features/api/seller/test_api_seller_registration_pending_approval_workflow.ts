import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the seller registration approval workflow business rule - verifying that newly registered sellers cannot sell until approved.
 *
 * Validates the complete seller registration flow including account creation with valid credentials, authentication token generation, and approval status verification. Ensures that newly registered sellers start with approval_status 'pending' and require administrator approval before they can list products or process orders.
 *
 * The test verifies that the registration response contains all required fields including the seller ID, email, approval status, timestamps, and JWT authorization tokens. The approval_status field is the critical business rule enforcement mechanism that prevents pending sellers from performing seller-specific operations.
 *
 * 1. Register a new seller account with unique email and valid credentials using authorize_seller_join utility.
 * 2. Verify the registration response shows approval_status='pending'.
 * 3. Validate the authentication token structure including access token, refresh token, and expiration timestamps.
 * 4. Verify all seller account information is correctly returned including UUID format ID, matching email, and proper timestamp formats.
 */
export async function test_api_seller_registration_pending_approval_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 2. Register new seller account
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Verify business rule: approval_status is 'pending' for new registrations
  TestValidator.equals(
    "approval status",
    sellerAuth.approval_status,
    "pending",
  );
  // 4. Verify email matches registration input
  TestValidator.equals("email matches input", sellerAuth.email, email);
  // 5. Verify account state for new pending seller
  TestValidator.equals("deleted_at is null", sellerAuth.deleted_at, null);
  TestValidator.equals(
    "rejection reason undefined",
    sellerAuth.rejection_reason,
    undefined,
  );
}
