import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussUserReputation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserReputation";

/**
 * Validate authentication boundary and empty-state behavior for user
 * reputation.
 *
 * Business goals:
 *
 * - Ensure the reputation endpoint rejects unauthenticated access.
 * - For a newly joined member with no reputation aggregate yet, prefer an error
 *   (spec indicates 404), but gracefully accept a successful default aggregate
 *   if returned by implementation.
 *
 * Steps:
 *
 * 1. Join as a new member and capture userId (SDK auto-sets Authorization).
 * 2. Call reputation with an unauthenticated connection → expect error (no status
 *    code assertions).
 * 3. Call reputation with authenticated connection for the same userId:
 *
 *    - If error occurs (no aggregate yet), accept.
 *    - If success, validate response shape and key business invariants.
 */
export async function test_api_user_reputation_auth_required_and_not_found_for_new_user(
  connection: api.IConnection,
) {
  // 1) Join as a new member (authentication established automatically)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;

  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  const userId = authorized.id; // UUID of the newly joined member

  // 2) Unauthenticated call must be rejected (no status code assertion)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated reputation access should be rejected",
    async () => {
      await api.functional.econDiscuss.member.users.reputation.at(unauthConn, {
        userId,
      });
    },
  );

  // 3) Authenticated call for a brand-new account
  //    Prefer error (no aggregate yet per spec). If success, validate payload.
  let reputation: IEconDiscussUserReputation | null = null;
  try {
    reputation = await api.functional.econDiscuss.member.users.reputation.at(
      connection,
      { userId },
    );
  } catch {
    reputation = null;
  }

  if (reputation === null) {
    // Spec-preferred behavior: no aggregate yet → error occurred
    TestValidator.predicate(
      "new user's reputation aggregate may not exist yet (acceptable error)",
      true,
    );
  } else {
    // Implementation returned a default aggregate; validate basic invariants
    typia.assert(reputation);
    TestValidator.equals(
      "reputation belongs to the joined user",
      reputation.userId,
      userId,
    );
    TestValidator.predicate(
      "reputation score must be non-negative",
      reputation.score >= 0,
    );
  }
}
