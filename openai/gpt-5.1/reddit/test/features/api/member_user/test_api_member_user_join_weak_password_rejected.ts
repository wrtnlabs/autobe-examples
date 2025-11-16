import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate rejection of weak passwords on member user self-registration.
 *
 * Business intent:
 *
 * - Ensure that the public join endpoint for member users enforces
 *   password-strength policies beyond basic type checking.
 * - When a clearly weak password is submitted, the registration must fail with a
 *   validation-style error, and no authenticated session must be created.
 *
 * Test steps:
 *
 * 1. Build a unique, valid IJoinRequest payload for a new member user, except for
 *    the password, which is deliberately weak (e.g., "123").
 * 2. Call POST /auth/memberUser/join via api.functional.auth.memberUser.join using
 *    this weak password, wrapped in TestValidator.error, asserting that the
 *    call fails.
 * 3. Rely on business rules (and the fact that the API threw) to conclude that no
 *    account/session was created for this identity.
 */
export async function test_api_member_user_join_weak_password_rejected(
  connection: api.IConnection,
) {
  // 1. Prepare a unique join payload with a deliberately weak password.
  const username: string = RandomGenerator.alphabets(12);
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  // Clearly weak password that should violate reasonable strength rules.
  const weakPassword: string = "123";

  const weakJoinBody = {
    username,
    email,
    password: weakPassword,
    href,
    referrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  // 2. Attempt to join with the weak password and expect an error.
  await TestValidator.error(
    "weak password must be rejected on member join",
    async () => {
      await api.functional.auth.memberUser.join(connection, {
        body: weakJoinBody,
      });
    },
  );
}
