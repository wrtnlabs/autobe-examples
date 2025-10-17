import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserProfile";

/**
 * Verify authentication boundary and successful retrieval of the caller’s self
 * profile.
 *
 * Steps:
 *
 * 1. Call GET /econDiscuss/member/me without authentication and expect an error.
 * 2. Register a new member via POST /auth/member/join (tokens are applied by SDK).
 * 3. Call GET /econDiscuss/member/me with the authenticated connection.
 * 4. Validate business fields: id consistency with auth subject,
 *    displayName/timezone/locale reflect join input, and emailVerified is false
 *    initially. Rely on typia.assert for all type/format validations.
 */
export async function test_api_member_self_profile_view_auth_boundary(
  connection: api.IConnection,
) {
  // 1) Unauthenticated boundary: use a cloned connection without headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to self profile must fail",
    async () => {
      await api.functional.econDiscuss.member.me.at(unauthConn);
    },
  );

  // 2) Register a new member and get authenticated via SDK-managed headers
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    // avatar_uri omitted intentionally
  } satisfies IEconDiscussMember.ICreate;

  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 3) Authenticated read of self profile
  const profile: IEconDiscussUserProfile =
    await api.functional.econDiscuss.member.me.at(connection);
  typia.assert(profile);

  // 4) Business validations (no extra type checks beyond typia.assert)
  TestValidator.equals(
    "profile.id must match authorized id",
    profile.id,
    authorized.id,
  );
  TestValidator.equals(
    "display name persists from join",
    profile.displayName,
    createBody.display_name,
  );
  TestValidator.equals(
    "timezone persists from join",
    profile.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals("locale persists from join", profile.locale, "en-US");
  TestValidator.equals(
    "emailVerified should be false right after join",
    profile.emailVerified,
    false,
  );
}
