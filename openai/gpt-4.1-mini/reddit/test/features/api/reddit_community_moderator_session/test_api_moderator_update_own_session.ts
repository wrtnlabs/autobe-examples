import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";

export async function test_api_moderator_update_own_session(
  connection: api.IConnection,
) {
  // 1. Admin creates a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorCreateBody = {
    email: moderatorEmail,
    password: "password123",
  } satisfies IRedditCommunityModerator.ICreate;

  const moderator: IRedditCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunityModerators.create(
      connection,
      { body: moderatorCreateBody },
    );
  typia.assert(moderator);

  // 2. Moderator joins (registers) using the email and password
  const moderatorJoinBody = {
    email: moderatorEmail,
    password: "password123",
  } satisfies IRedditCommunityModerator.ICreate;

  const moderatorAuth: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuth);
  TestValidator.equals(
    "Moderator ID after join equals created ID",
    moderatorAuth.id,
    moderator.id,
  );

  // 3. Moderator login to renew token and establish session
  const loginBody = {
    email: moderatorEmail,
    password: "password123",
    ip: null,
    href: "https://example.com/start",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityModerator.ILogin;
  const moderatorLogin = await api.functional.auth.moderator.login(connection, {
    body: loginBody,
  });
  typia.assert(moderatorLogin);
  TestValidator.equals(
    "Moderator ID after login same as created",
    moderatorLogin.id,
    moderator.id,
  );

  // 4. Assume moderator has at least one session created, simulate creation by using dummy session data
  // Since session create API not provided, simulate session creation using typia.random
  // But actual session to update must exist, so we use update to create new session in test logic

  // Prepare current session data
  const originalSessionBody = {
    ip: "192.168.1.100" as string & tags.Format<"ipv4">,
    href: "https://example.com/page1" as string & tags.Format<"uri">,
    referrer: "https://google.com/" as string & tags.Format<"uri">,
    expires: new Date(new Date().getTime() + 3600 * 1000).toISOString(), // expire in 1 hour
  } satisfies IRedditCommunityModeratorSession.IUpdate;

  // 5. Create a session by updating with new ID (simulate creation by update call for test purpose)
  // Generate a session id
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Update session with original data
  const sessionInitial =
    await api.functional.redditCommunity.moderator.redditCommunityModerators.sessions.update(
      connection,
      {
        redditCommunityModeratorId: moderator.id,
        id: sessionId,
        body: originalSessionBody,
      },
    );
  typia.assert(sessionInitial);
  TestValidator.equals(
    "Session initial moderator id matches moderator id",
    sessionInitial.reddit_community_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "Session initial ip matches original",
    sessionInitial.ip ?? null,
    originalSessionBody.ip,
  );
  TestValidator.equals(
    "Session initial href matches original",
    sessionInitial.href,
    originalSessionBody.href,
  );
  TestValidator.equals(
    "Session initial referrer matches original",
    sessionInitial.referrer,
    originalSessionBody.referrer,
  );

  // 6. Update the session with new connection data
  const updatedSessionBody = {
    ip: "192.168.1.101" as string & tags.Format<"ipv4">,
    href: "https://example.com/page2" as string & tags.Format<"uri">,
    referrer: "https://bing.com/" as string & tags.Format<"uri">,
    expires: new Date(new Date().getTime() + 7200 * 1000).toISOString(), // expire in 2 hours
  } satisfies IRedditCommunityModeratorSession.IUpdate;

  const updatedSession =
    await api.functional.redditCommunity.moderator.redditCommunityModerators.sessions.update(
      connection,
      {
        redditCommunityModeratorId: moderator.id,
        id: sessionId,
        body: updatedSessionBody,
      },
    );
  typia.assert(updatedSession);
  TestValidator.equals(
    "Updated session moderator id matches moderator id",
    updatedSession.reddit_community_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "Updated session ip matches updated",
    updatedSession.ip ?? null,
    updatedSessionBody.ip,
  );
  TestValidator.equals(
    "Updated session href matches updated",
    updatedSession.href,
    updatedSessionBody.href,
  );
  TestValidator.equals(
    "Updated session referrer matches updated",
    updatedSession.referrer,
    updatedSessionBody.referrer,
  );
  TestValidator.notEquals(
    "Session ip changed after update",
    updatedSession.ip,
    sessionInitial.ip,
  );
  TestValidator.notEquals(
    "Session href changed after update",
    updatedSession.href,
    sessionInitial.href,
  );
  TestValidator.notEquals(
    "Session referrer changed after update",
    updatedSession.referrer,
    sessionInitial.referrer,
  );

  // 7. Test that a different moderator or admin cannot update this session (negative test)
  // Admin creates another moderator
  const anotherModEmail = typia.random<string & tags.Format<"email">>();
  const anotherModeratorCreateBody = {
    email: anotherModEmail,
    password: "password456",
  } satisfies IRedditCommunityModerator.ICreate;
  const anotherModerator: IRedditCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunityModerators.create(
      connection,
      { body: anotherModeratorCreateBody },
    );
  typia.assert(anotherModerator);

  // Another moderator joins (login)
  const anotherModeratorJoinBody = {
    email: anotherModEmail,
    password: "password456",
  } satisfies IRedditCommunityModerator.ICreate;
  await api.functional.auth.moderator.join(connection, {
    body: anotherModeratorJoinBody,
  });

  // Try to update the session with another moderator - expect error
  await TestValidator.error(
    "Another moderator cannot update session",
    async () => {
      await api.functional.redditCommunity.moderator.redditCommunityModerators.sessions.update(
        connection,
        {
          redditCommunityModeratorId: anotherModerator.id,
          id: sessionId,
          body: updatedSessionBody,
        },
      );
    },
  );

  // Also test that admin cannot update moderator session - negative test
  // Admin join and login for actor switching
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "adminpass123",
    href: "https://example.com/admin/href",
    referrer: "https://example.com/admin/referrer",
  } satisfies IRedditCommunityAdmin.IJoin;
  const adminUser = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminUser);

  // Test admin login
  const adminLoginBody = {
    username: adminUser.id,
    password: "adminpass123",
    ip: null,
    href: "https://example.com/admin/href",
    referrer: "https://example.com/admin/referrer",
  } satisfies IRedditCommunityAdmin.ILogin;
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // Admin tries to update the moderator session - expect error
  await TestValidator.error(
    "Admin cannot update moderator session",
    async () => {
      await api.functional.redditCommunity.moderator.redditCommunityModerators.sessions.update(
        connection,
        {
          redditCommunityModeratorId: moderator.id,
          id: sessionId,
          body: updatedSessionBody,
        },
      );
    },
  );
}
