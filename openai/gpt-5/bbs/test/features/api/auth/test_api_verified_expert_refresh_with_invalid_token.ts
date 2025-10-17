import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";
import type { IEconDiscussVerifiedExpertRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertRefresh";

/**
 * Verified Expert refresh denies invalid/expired token.
 *
 * This test verifies the authentication boundary of the refresh endpoint: when
 * a syntactically valid but invalid/expired refresh token is presented, the
 * server must reject rotation and must not issue new credentials.
 *
 * Steps
 *
 * 1. Optionally register a verified expert account via join to obtain a valid
 *    token bundle.
 * 2. Create a tampered refresh token that is guaranteed to be different from the
 *    legitimate one while still satisfying DTO constraints (MinLength<20>),
 *    e.g., by appending a suffix.
 * 3. Call POST /auth/verifiedExpert/refresh with the invalid token and expect the
 *    call to error. Per policy, do not assert specific HTTP status codes; only
 *    assert that an error occurs.
 * 4. Ensure no tokens are issued by virtue of the error (no response payload).
 */
export async function test_api_verified_expert_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // 1) Join to establish baseline context and obtain a legitimate refresh token
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // MinLength<8>
    display_name: RandomGenerator.name(), // 1..120 chars
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;
  const joined: IEconDiscussVerifiedExpert.IAuthorized =
    await api.functional.auth.verifiedExpert.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2) Prepare an invalid token that still satisfies MinLength<20>
  //    Use a tampered version of the real refresh token to ensure logical invalidity
  const invalidRefresh: string = `${joined.token.refresh}-tampered-${RandomGenerator.alphaNumeric(12)}`;
  TestValidator.notEquals(
    "tampered refresh token must differ from the original",
    invalidRefresh,
    joined.token.refresh,
  );

  // 3) Attempt refresh with invalid token → expect rejection (generic error only)
  await TestValidator.error(
    "refresh must be rejected with invalid/expired token",
    async () => {
      await api.functional.auth.verifiedExpert.refresh(connection, {
        body: {
          refresh_token: invalidRefresh,
        } satisfies IEconDiscussVerifiedExpertRefresh.ICreate,
      });
    },
  );
}
