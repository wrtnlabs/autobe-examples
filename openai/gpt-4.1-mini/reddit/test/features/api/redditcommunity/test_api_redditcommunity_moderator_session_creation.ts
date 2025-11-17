import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";

/**
 * Test for reddit community moderator session creation.
 *
 * This test validates the entire lifecycle of moderator session creation
 * including:
 *
 * 1. Create and login admin user.
 * 2. Create a reddit community moderator account as admin.
 * 3. Register the moderator by authenticating via moderator join API.
 * 4. Login as moderator to simulate user switch.
 * 5. Create moderator session with realistic ip, href, and referrer.
 * 6. Assert response correctness and association with moderator.
 */
export async function test_api_redditcommunity_moderator_session_creation(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(6)}@test.com`;
  const adminPassword = "AdminPass123!";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
  } satisfies IRedditCommunityAdmin.IJoin;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Admin login
  const adminLoginBody = {
    username: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com",
  } satisfies IRedditCommunityAdmin.ILogin;
  const adminLogin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Create reddit community moderator account as admin
  const moderatorEmail = `mod_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const moderatorPassword = "ModPass123!";
  const moderatorCreateBody = {
    email: moderatorEmail,
    password: moderatorPassword,
  } satisfies IRedditCommunityModerator.ICreate;
  const moderator: IRedditCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunityModerators.create(
      connection,
      {
        body: moderatorCreateBody,
      },
    );
  typia.assert(moderator);

  // 4. Register moderator via join to authenticate
  const modJoinBody = {
    email: moderatorEmail,
    password: moderatorPassword,
  } satisfies IRedditCommunityModerator.ICreate;
  const joinedModerator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: modJoinBody,
    });
  typia.assert(joinedModerator);

  // 5. Moderator login to switch actor
  const modLoginBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    ip: "192.168.1.100",
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com",
  } satisfies IRedditCommunityModerator.ILogin;
  const modLogin: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: modLoginBody,
    });
  typia.assert(modLogin);

  // 6. Create moderator session
  const sessionCreateBody = {
    ip: "192.168.1.100",
    href: "https://moderator.example.com/dashboard",
    referrer: "https://moderator.example.com/home",
    expires: null,
  } satisfies IRedditCommunityModeratorSession.ICreate;
  const session: IRedditCommunityModeratorSession =
    await api.functional.redditCommunity.moderator.redditCommunityModerators.sessions.create(
      connection,
      {
        redditCommunityModeratorId: moderator.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // 7. Assertion checks
  TestValidator.equals(
    "session redditCommunityModeratorId matches moderator id",
    session.reddit_community_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "session ip matches",
    session.ip ?? null,
    sessionCreateBody.ip ?? null,
  );
  TestValidator.equals(
    "session href matches",
    session.href,
    sessionCreateBody.href,
  );
  TestValidator.equals(
    "session referrer matches",
    session.referrer,
    sessionCreateBody.referrer,
  );
  TestValidator.equals(
    "session expires_at matches",
    session.expires_at ?? null,
    sessionCreateBody.expires ?? null,
  );
}
