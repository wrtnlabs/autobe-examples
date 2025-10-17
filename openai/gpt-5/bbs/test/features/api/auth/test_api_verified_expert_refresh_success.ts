import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";
import type { IEconDiscussVerifiedExpertRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertRefresh";

/**
 * Refresh verified expert tokens using a valid refresh token issued at join
 * time.
 *
 * Business flow:
 *
 * 1. Join as a verified expert candidate to obtain the initial token bundle
 *    (access/refresh/expirations) and subject claims.
 * 2. Call POST /auth/verifiedExpert/refresh with the refresh token.
 * 3. Validate that:
 *
 *    - Response types are correct (via typia.assert)
 *    - Subject id remains the same
 *    - Role stays as "verifiedExpert"
 *    - Access token is rotated (differs from the previous one)
 *
 * Implementation notes:
 *
 * - Request bodies are declared with `satisfies` to preserve strict typing.
 * - No connection.headers manipulation (SDK handles Authorization updates).
 * - No redundant type/format checks after typia.assert().
 */
export async function test_api_verified_expert_refresh_success(
  connection: api.IConnection,
) {
  // 1) Join: acquire initial token bundle and subject claims
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12); // >= 8 chars
  const displayName: string = RandomGenerator.name(1);

  const joinBody = {
    email,
    password,
    display_name: displayName,
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;

  const first = await api.functional.auth.verifiedExpert.join(connection, {
    body: joinBody,
  });
  typia.assert(first);

  const firstAccess: string = first.token.access;
  const firstRefresh: string = first.token.refresh;

  // 2) Refresh: rotate token bundle using refresh token
  const refreshBody = {
    refresh_token: firstRefresh,
  } satisfies IEconDiscussVerifiedExpertRefresh.ICreate;

  const second = await api.functional.auth.verifiedExpert.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(second);

  // 3) Business validations
  TestValidator.equals(
    "subject id remains consistent across refresh",
    second.id,
    first.id,
  );
  TestValidator.equals(
    "role remains verifiedExpert after refresh",
    second.role,
    "verifiedExpert",
  );
  TestValidator.notEquals(
    "access token is rotated on refresh",
    second.token.access,
    firstAccess,
  );

  // Note: typia.assert already validated date-time formats and full shapes.
}
