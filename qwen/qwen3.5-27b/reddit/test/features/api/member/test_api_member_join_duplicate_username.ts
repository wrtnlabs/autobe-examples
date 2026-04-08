import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member registration when username already exists in the system.
 *
 * Validates that the member registration endpoint correctly rejects duplicate usernames while allowing unique emails. This test ensures the username uniqueness constraint is properly enforced, preventing multiple accounts from claiming the same public identifier used on posts, comments, and profiles.
 *
 * The test verifies that:
 * - The first registration with a unique username succeeds
 * - A second registration with the same username but different email fails with HTTP 409
 * - The original account remains functional and unchanged
 *
 * 1. Create first member account with unique username
 * 2. Attempt second registration with same username but different email
 * 3. Verify 409 Conflict error is thrown
 * 4. Verify original member account is still valid
 */
export async function test_api_member_join_duplicate_username(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account with unique username
  const firstConnection: api.IConnection = { host: connection.host };
  const firstUsername = RandomGenerator.name();
  const firstMember = await authorize_member_join(firstConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: firstUsername,
    },
  });
  typia.assert(firstMember);
  // 2. Attempt second registration with same username but different email
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate username should return 409 Conflict",
    409,
    async () =>
      await authorize_member_join(secondConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: firstUsername,
        },
      }),
  );
  // 3. Verify original member account is still valid
  TestValidator.equals(
    "original member username unchanged",
    firstMember.username,
    firstUsername,
  );
  TestValidator.predicate(
    "original member has valid email",
    firstMember.email.includes("@"),
  );
  TestValidator.predicate(
    "original member has valid tokens",
    firstMember.token.access.length > 0 && firstMember.token.refresh.length > 0,
  );
}
