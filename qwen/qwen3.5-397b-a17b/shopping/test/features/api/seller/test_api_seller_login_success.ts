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
 * Test successful seller login with approved account status.
 *
 * Validates the complete seller authentication flow including account registration, credential validation, and JWT token issuance. Ensures that only sellers with approved status can successfully authenticate and that the response contains all required authorization token fields.
 *
 * The test creates a seller account with randomized credentials, then attempts login with the same credentials. Session context metadata (href, referrer, ip) is captured for security auditing purposes. The authorization token response is validated to ensure proper JWT structure and expiration timestamps.
 *
 * 1. Register a new seller account with random email and password using authorize_seller_join utility.
 * 2. Login with the registered credentials using authorize_seller_login utility with session context.
 * 3. Validate response contains seller account information with approval_status.
 * 4. Validate authorization token contains access, refresh, expired_at, and refreshable_until fields.
 * 5. Verify token expiration timestamps are set to future dates.
 */
export async function test_api_seller_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account with credentials
  const password = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  // 2. Login with registered credentials (same password)
  const loginCredentials = {
    email: sellerJoinResult.email,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.ILogin;
  const loginResult = await authorize_seller_login(connection, {
    body: loginCredentials,
  });
  typia.assert(loginResult);
  // 3. Validate seller account information matches registration
  TestValidator.equals(
    "seller id matches",
    loginResult.id,
    sellerJoinResult.id,
  );
  TestValidator.equals(
    "email matches",
    loginResult.email,
    sellerJoinResult.email,
  );
  TestValidator.predicate(
    "approval status is approved",
    loginResult.approval_status === "approved",
  );
  // 4. Validate token expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is in future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
}
