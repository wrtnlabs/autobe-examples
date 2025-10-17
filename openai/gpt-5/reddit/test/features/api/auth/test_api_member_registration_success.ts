import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

/**
 * Validate successful member registration and immediate authorization issuance.
 *
 * Business flow
 *
 * 1. Build an unauthenticated connection (empty headers) to ensure the join
 *    endpoint is publicly accessible without prior tokens.
 * 2. Generate compliant registration data:
 *
 *    - Email (Format<"email">)
 *    - Username (^[A-Za-z0-9_]{3,20}$)
 *    - Password (8–64 chars, must include at least one letter and one digit)
 *    - Terms_accepted_at, privacy_accepted_at (Format<"date-time">)
 *    - Optional marketing_opt_in boolean
 * 3. Call POST /auth/memberUser/join and await result.
 * 4. Validate response schema (IAuthorized) with typia.assert and perform business
 *    checks: token strings are non-empty; if username is present in the
 *    response, it should match the submitted username.
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
) {
  // 1) Use unauthenticated connection (do not touch original headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Prepare valid registration payload
  const email = typia.random<string & tags.Format<"email">>();
  const username = `${RandomGenerator.alphabets(6)}_${RandomGenerator.alphabets(3)}`; // length within 3-20, pattern-compliant
  const password = `A1${RandomGenerator.alphaNumeric(10)}`; // ensures letter+digit and length >= 12
  const termsAcceptedAt = typia.random<string & tags.Format<"date-time">>();
  const privacyAcceptedAt = typia.random<string & tags.Format<"date-time">>();
  const marketingOptIn = RandomGenerator.pick([true, false] as const);

  const body = {
    email,
    username,
    password,
    terms_accepted_at: termsAcceptedAt,
    privacy_accepted_at: privacyAcceptedAt,
    marketing_opt_in: marketingOptIn,
  } satisfies ICommunityPlatformMemberUser.ICreate;

  // 3) Execute registration
  const authorized = await api.functional.auth.memberUser.join(unauthConn, {
    body,
  });

  // 4) Schema validation and business assertions
  typia.assert(authorized);

  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );

  if (authorized.username !== undefined) {
    TestValidator.equals(
      "returned username echoes input",
      authorized.username,
      body.username,
    );
  }
}
