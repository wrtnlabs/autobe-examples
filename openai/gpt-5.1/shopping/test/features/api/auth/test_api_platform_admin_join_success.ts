import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate successful platform administrator registration and initial
 * authorization token issuance.
 *
 * This test covers the happy-path flow of POST /auth/platformAdmin/join. It
 * ensures that:
 *
 * 1. A new platform admin can register with valid credentials and context.
 * 2. The response matches IShoppingMallPlatformAdmin.IAuthorized.
 * 3. Identity fields (email, displayName, status, isActive, timestamps) are
 *    populated in a consistent, business-meaningful way.
 * 4. The embedded IAuthorizationToken carries non-empty access/refresh tokens with
 *    sensible expiration ordering.
 */
export async function test_api_platform_admin_join_success(
  connection: api.IConnection,
) {
  // 1. Prepare realistic join request payload
  const email = typia.random<string & tags.Format<"email">>();
  const name = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const body = {
    email,
    name,
    password,
    // ip is optional (string | null | undefined) - omit to use undefined
    href,
    referrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  // 2. Call join API
  const output: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, { body });

  // 3. Type-level validation of the response
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(output);

  // 4. Business validations on identity fields
  TestValidator.equals("email echoed back", output.email, email);

  TestValidator.predicate(
    "display name non-empty",
    output.displayName.length > 0,
  );

  TestValidator.predicate(
    "id is non-empty uuid-like string",
    output.id.length > 0,
  );

  TestValidator.predicate("status non-empty", output.status.length > 0);

  TestValidator.predicate(
    "newly joined admin is active",
    output.isActive === true,
  );

  // createdAt and updatedAt are ISO date-time; ensure updatedAt is not earlier
  const createdAtDate = new Date(output.createdAt);
  const updatedAtDate = new Date(output.updatedAt);

  TestValidator.predicate(
    "createdAt is valid date",
    !Number.isNaN(createdAtDate.getTime()),
  );

  TestValidator.predicate(
    "updatedAt is valid date",
    !Number.isNaN(updatedAtDate.getTime()),
  );

  TestValidator.predicate(
    "updatedAt is not before createdAt",
    updatedAtDate.getTime() >= createdAtDate.getTime(),
  );

  // 5. Token validations
  const token: IAuthorizationToken = output.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate("access token non-empty", token.access.length > 0);

  TestValidator.predicate("refresh token non-empty", token.refresh.length > 0);

  const accessExpiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);

  TestValidator.predicate(
    "access token expiry is valid date",
    !Number.isNaN(accessExpiredAt.getTime()),
  );

  TestValidator.predicate(
    "refresh token expiry is valid date",
    !Number.isNaN(refreshableUntil.getTime()),
  );

  TestValidator.predicate(
    "refreshable_until is not earlier than expired_at",
    refreshableUntil.getTime() >= accessExpiredAt.getTime(),
  );
}
