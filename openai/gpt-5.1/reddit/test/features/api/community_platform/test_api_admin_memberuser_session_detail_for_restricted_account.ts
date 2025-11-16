import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuserSession";

/**
 * Validate that an authenticated adminUser can inspect a member user's session
 * detail even when the member account has an active restriction episode.
 *
 * Business goals:
 *
 * 1. Ensure admin join flow works and issues a token that authorizes
 *    communityPlatform adminUser APIs.
 * 2. Verify that a generic account restriction episode can be created.
 * 3. Verify that an account restriction can be associated with a member user
 *    identified by username.
 * 4. Call the session detail endpoint for a (username, sessionId) pair and
 *    validate the response type as ICommunityPlatformMemberuserSession.
 * 5. Confirm basic invariants on the returned session record while assuming that
 *    the test harness provides appropriate username/sessionId values or runs in
 *    simulate mode.
 */
export async function test_api_admin_memberuser_session_detail_for_restricted_account(
  connection: api.IConnection,
) {
  // 1. Admin joins and receives an authorized context (token installed on connection)
  const adminJoinBody =
    typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a generic account restriction episode (not yet tied to any account)
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const genericRestrictionCreate = {
    account_type: "memberUser",
    scope: "login",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: now.toISOString(),
    ends_at: new Date(now.getTime() + oneDayMs).toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const genericRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: genericRestrictionCreate,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(genericRestriction);

  // 3. Link a new restriction episode to a specific member user by username
  const targetUsername: string = RandomGenerator.name(1);

  const memberRestrictionCreate = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: now.toISOString(),
    ends_at: new Date(now.getTime() + oneDayMs).toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const memberRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.create(
      connection,
      {
        username: targetUsername,
        body: memberRestrictionCreate,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(memberRestriction);

  // 4. Retrieve session details for (username, sessionId)
  //    The scenario assumes the test harness guarantees that these correspond
  //    to a real session record or that the SDK runs in simulate mode.
  const sessionId: string = RandomGenerator.alphaNumeric(32);

  const session =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.at(
      connection,
      {
        username: targetUsername,
        sessionId,
      },
    );
  typia.assert<ICommunityPlatformMemberuserSession>(session);

  // 5. Light business assertions on the returned session record
  TestValidator.predicate(
    "session id must be non-empty",
    session.id.length > 0,
  );
  TestValidator.predicate(
    "session must have a memberUser summary object",
    session.memberUser !== null && session.memberUser !== undefined,
  );
  TestValidator.predicate(
    "memberUser username must be non-empty",
    session.memberUser.username.length > 0,
  );
  TestValidator.predicate(
    "session created_at must be non-empty ISO string",
    session.created_at.length > 0,
  );
}
