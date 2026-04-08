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
 * Test seller login when the account has pending approval status.
 *
 * Validates that sellers can successfully authenticate and access their account dashboard even when their application is awaiting administrator approval. The test verifies that the login response includes the correct approval status and that all seller profile information is properly returned.
 *
 * 1. Register a new seller account with valid credentials via authorize_seller_join utility
 * 2. The seller account is automatically created with 'pending' approval status
 * 3. Login with the registered credentials via authorize_seller_login utility
 * 4. Verify the login response contains correct approval status fields
 * 5. Validate that pending sellers can authenticate successfully
 */
export async function test_api_seller_login_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate credentials for seller registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 2. Register a new seller account (automatically created with 'pending' status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const registeredSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(registeredSeller);
  // 3. Verify the registered seller has 'pending' approval status
  TestValidator.equals(
    "approval_status is pending after registration",
    registeredSeller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "approval_reason is null for pending seller",
    registeredSeller.approval_reason,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null for pending seller",
    registeredSeller.rejection_reason,
    null,
  );
  TestValidator.equals(
    "suspended is false for new seller",
    registeredSeller.suspended,
    false,
  );
  TestValidator.equals(
    "banned is false for new seller",
    registeredSeller.banned,
    false,
  );
  // 4. Login with the registered seller credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedInSeller = await authorize_seller_login(loginConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loggedInSeller);
  // 5. Verify the login response maintains 'pending' status
  TestValidator.equals(
    "approval_status remains pending after login",
    loggedInSeller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "approval_reason is null for pending seller",
    loggedInSeller.approval_reason,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null for pending seller",
    loggedInSeller.rejection_reason,
    null,
  );
  TestValidator.equals(
    "suspended is false for pending seller",
    loggedInSeller.suspended,
    false,
  );
  TestValidator.equals(
    "banned is false for pending seller",
    loggedInSeller.banned,
    false,
  );
  // 6. Verify seller ID matches between registration and login
  TestValidator.equals(
    "seller ID matches between registration and login",
    loggedInSeller.id,
    registeredSeller.id,
  );
  // 7. Verify email matches
  TestValidator.equals(
    "email matches between registration and login",
    loggedInSeller.email,
    email,
  );
  // 8. Verify token is present and valid
  TestValidator.predicate(
    "access token is present",
    loggedInSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    loggedInSeller.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is present",
    loggedInSeller.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is present",
    loggedInSeller.token.refreshable_until.length > 0,
  );
}
