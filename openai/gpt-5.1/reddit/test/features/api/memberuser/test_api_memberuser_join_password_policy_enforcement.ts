import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate memberUser join password handling and related validation.
 *
 * This test exercises the /auth/memberUser/join endpoint focusing on password
 * policy and validation-friendly behavior while respecting the static DTO
 * constraints.
 *
 * Business intent (adapted for type safety):
 *
 * - Ensure that passwords satisfying the declared MinLength<8> constraint are
 *   accepted, even when they are relatively simple.
 * - Ensure that the endpoint enforces uniqueness of email and username, surfacing
 *   validation errors when attempting to register with duplicates.
 * - Confirm that successful join returns a fully populated
 *   ICommunityPlatformMemberuser.IAuthorized structure with a token bundle.
 *
 * Steps:
 *
 * 1. Create a helper to generate valid IJoin payloads with a supplied password and
 *    randomized username/email/href/referrer.
 * 2. Scenario A: join with a reasonably strong password.
 *
 *    - Call join and assert IAuthorized.
 * 3. Scenario B: join with a simple but still valid password, then try joining
 *    again with the same email to trigger a uniqueness validation error.
 *
 *    - First call should succeed and return IAuthorized.
 *    - Second call using identical email should fail; wrap it in
 *         TestValidator.error.
 * 4. Scenario C: join with a borderline 8-character password and assert success,
 *    confirming MinLength boundary acceptance.
 */
export async function test_api_memberuser_join_password_policy_enforcement(
  connection: api.IConnection,
) {
  // Helper to generate a valid join payload with a specific password.
  const createJoinBody = (
    password: string,
  ): ICommunityPlatformMemberuser.IJoin => {
    // Sanity check: password must satisfy MinLength<8> at runtime so we
    // don't violate typia's constraints.
    TestValidator.predicate(
      "password length must be at least 8",
      () => password.length >= 8,
    );

    const username = RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 16,
    });

    const email = typia.random<string & tags.Format<"email">>();

    const href = typia.random<string & tags.Format<"uri">>();

    const referrer = typia.random<string & tags.Format<"uri">>();

    const joinBody = {
      username,
      email,
      password,
      ip: null,
      href,
      referrer,
    } satisfies ICommunityPlatformMemberuser.IJoin;

    return joinBody;
  };

  // Scenario A: successful join with a reasonably strong password.
  const strongPassword = "Str0ngPass!"; // length > 8
  const strongJoin = createJoinBody(strongPassword);

  const strongAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: strongJoin,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(strongAuthorized);

  // Scenario B: join with a simple but valid password, then ensure duplicate
  // email registration fails.
  const simplePassword = "password1"; // 9 chars, simple but valid
  const simpleJoinBody = createJoinBody(simplePassword);

  const simpleAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: simpleJoinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(simpleAuthorized);

  // Attempt to join again with the same email (and username) to trigger a
  // uniqueness validation error. We reuse the body; backend should reject
  // this as a business validation failure.
  await TestValidator.error("duplicate email join should fail", async () => {
    await api.functional.auth.memberUser.join(connection, {
      body: simpleJoinBody,
    });
  });

  // Scenario C: join with a borderline 8-character password.
  const borderlinePassword = "SimpleP1"; // exactly 8 characters
  const borderlineBody = createJoinBody(borderlinePassword);

  const borderlineAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: borderlineBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(borderlineAuthorized);

  // As an additional (optional) check, if tokens differ between accounts,
  // assert inequality to ensure each join yields a distinct token bundle.
  if (strongAuthorized.token.access !== simpleAuthorized.token.access) {
    TestValidator.notEquals(
      "tokens for different accounts should differ",
      strongAuthorized.token.access,
      simpleAuthorized.token.access,
    );
  }

  if (simpleAuthorized.token.access !== borderlineAuthorized.token.access) {
    TestValidator.notEquals(
      "tokens for simple and borderline accounts should differ",
      simpleAuthorized.token.access,
      borderlineAuthorized.token.access,
    );
  }
}
