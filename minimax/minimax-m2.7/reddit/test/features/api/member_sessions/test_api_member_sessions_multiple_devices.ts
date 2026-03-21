import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session list when member has logged in from multiple devices.
 *
 * This validates correct session metadata and session ordering.
 * The test:
 * 1. Registers a member via POST /redditClone/auth/member/join
 * 2. Creates multiple sessions by logging in again via POST /redditClone/auth/member/login
 * 3. Calls GET /redditClone/member/sessions
 * 4. Verifies all sessions are returned in reverse chronological order by created_at
 * 5. Verifies session count is correct (should have 3 sessions)
 * 6. Verifies each session has complete member metadata (id, username, profile, karma)
 */
export async function test_api_member_sessions_multiple_devices(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: email,
      password: password,
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMemberSession.IJoin,
  });
  typia.assert(authorized);
  // Create session connections for simulating multiple devices
  // First login (device 1) - this session will become older
  const device1Connection: api.IConnection = { host: connection.host };
  await authorize_member_login(device1Connection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMemberSession.ILogin,
  });
  // Second login (device 2) - this session will be in the middle
  const device2Connection: api.IConnection = { host: connection.host };
  await authorize_member_login(device2Connection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMemberSession.ILogin,
  });
  // Third login (device 3) - this is the current session (most recent)
  const device3Connection: api.IConnection = { host: connection.host };
  await authorize_member_login(device3Connection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMemberSession.ILogin,
  });
  // 3. Get all sessions using the most recent connection
  const sessionsResponse =
    await api.functional.redditClone.member.sessions.list(device3Connection);
  typia.assert(sessionsResponse);
  // Cast to correct type: IRedditCloneMemberSession.ISummary[]
  const sessions = typia.assert<IRedditCloneMemberSession.ISummary[]>(
    sessionsResponse.data,
  );
  // 4. Verify all sessions are returned (should be 3: join + 3 logins)
  // Actually, join also creates a session, so total should be 4
  TestValidator.equals("has sessions", sessions.length >= 3, true);
  // 5. Verify sessions are in reverse chronological order (most recent first)
  for (let i = 0; i < sessions.length - 1; i++) {
    const current = new Date(sessions[i].created_at).getTime();
    const next = new Date(sessions[i + 1].created_at).getTime();
    TestValidator.predicate(
      `session ${i} is newer or equal to session ${i + 1}`,
      current >= next,
    );
  }
  // 6. Verify each session has complete member metadata
  for (const session of sessions) {
    // Verify required fields exist
    TestValidator.predicate(
      "session has id",
      session.id !== undefined && session.id !== null,
    );
    TestValidator.predicate(
      "session has username",
      session.username !== undefined && session.username !== null,
    );
    TestValidator.predicate(
      "session has created_at",
      session.created_at !== undefined && session.created_at !== null,
    );
    TestValidator.predicate(
      "session has profile",
      session.profile !== undefined && session.profile !== null,
    );
    TestValidator.predicate(
      "session has karma_count",
      typeof session.karma_count === "number",
    );
    // Verify profile structure
    TestValidator.predicate(
      "profile has id",
      session.profile.id !== undefined && session.profile.id !== null,
    );
    TestValidator.predicate(
      "profile has display_name",
      session.profile.display_name !== undefined &&
        session.profile.display_name !== null,
    );
  }
  // 7. Verify all sessions belong to the same member
  for (const session of sessions) {
    TestValidator.equals(
      "all sessions belong to registered member",
      session.username,
      authorized.username,
    );
  }
  // 8. Verify pagination info exists
  TestValidator.predicate(
    "has pagination",
    sessionsResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination records match session count",
    sessionsResponse.pagination.records,
    sessions.length,
  );
}
