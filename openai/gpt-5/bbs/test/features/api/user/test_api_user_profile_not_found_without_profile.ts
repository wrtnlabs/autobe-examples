import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserProfile";

/**
 * Validate that requesting a user's extended profile errors when no profile
 * exists.
 *
 * Business context:
 *
 * - Newly joined members do not have an extended profile row yet.
 * - Public profile endpoint should signal not-found when profile is absent.
 *
 * Steps:
 *
 * 1. Join a new member to obtain a valid userId (do NOT create any profile).
 * 2. Create a public (unauthenticated) connection clone.
 * 3. Call GET /econDiscuss/users/{userId}/profile and assert it throws an error
 *    (without asserting specific HTTP status code per test policy).
 */
export async function test_api_user_profile_not_found_without_profile(
  connection: api.IConnection,
) {
  // 1) Join a new member to get a valid userId
  const registrantConn: api.IConnection = { ...connection, headers: {} };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!123", // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;

  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(registrantConn, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Public (unauthenticated) connection clone
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // 3) Expect error when profile is absent (do not assert HTTP status codes)
  await TestValidator.error(
    "profile request without existing profile should throw",
    async () => {
      await api.functional.econDiscuss.users.profile.at(publicConn, {
        userId: authorized.id,
      });
    },
  );
}
