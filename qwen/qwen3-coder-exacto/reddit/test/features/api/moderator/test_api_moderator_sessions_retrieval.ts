import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModeratorSession";
import type { ICommunityForumCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunitySubscription";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityModeratorSession";

export async function test_api_moderator_sessions_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user who will become a moderator
  const userJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphaNumeric(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinData,
    });
  typia.assert(user);

  // Step 2: Create an administrator account to assign moderators
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinData = {
    email: adminEmail,
    password: "admin123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
      "_admin_" +
      RandomGenerator.alphaNumeric(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const adminUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: adminJoinData,
    });
  typia.assert(adminUser);

  // Make this user an administrator
  const adminCreateData = {
    community_forum_user_id: adminUser.id,
    role: "system_admin",
  } satisfies ICommunityForumCommunityAdministrator.ICreate;

  const admin: ICommunityForumCommunityAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 3: Login as administrator
  const adminLoginData = {
    email: adminEmail,
    password: "admin123",
    href: "http://localhost:3000/admin/login",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumCommunityAdministrator.ILogin;

  await api.functional.auth.administrator.login(connection, {
    body: adminLoginData,
  });

  // Step 4: Create a community
  const communityData = {
    name:
      RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(5),
    slug:
      RandomGenerator.name(1).replace(/\s+/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(5),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 7 }),
    privacy_level: RandomGenerator.pick([
      "public",
      "private",
      "restricted",
    ] as const),
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 5: Assign the user as a moderator for the community
  const moderatorCreateData = {
    community_forum_user_id: user.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator: ICommunityForumCommunityModerator =
    await api.functional.communityForum.administrator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: moderatorCreateData,
      },
    );
  typia.assert(moderator);

  // Step 6: Login as the moderator
  const moderatorLoginData = {
    email: userJoinData.email,
    password: "password123",
    href: "http://localhost:3000/moderator/login",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumCommunityModerator.ILogin;

  const moderatorAuth: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorLoginData,
    });
  typia.assert(moderatorAuth);

  // Step 7: Retrieve sessions for the moderator
  const sessionRequestData = {
    page: 1,
    limit: 10,
    sort: "created_at:desc" as const,
    status: "active" as const,
  } satisfies ICommunityForumCommunityModeratorSession.IRequest;

  const sessions: IPageICommunityForumCommunityModeratorSession.ISummary =
    await api.functional.communityForum.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: sessionRequestData,
      },
    );
  typia.assert(sessions);

  // Step 8: Validate the response
  TestValidator.predicate(
    "session pagination should have at least one session for the new moderator",
    () => sessions.pagination.records >= 1,
  );

  TestValidator.predicate(
    "session data array should match pagination records count",
    () => sessions.data.length === sessions.pagination.records,
  );

  TestValidator.predicate(
    "session pagination current page should be 1",
    () => sessions.pagination.current === 1,
  );

  TestValidator.predicate(
    "session pagination limit should be 10",
    () => sessions.pagination.limit === 10,
  );

  // Validate session data structure if sessions exist
  if (sessions.data.length > 0) {
    const firstSession = sessions.data[0];
    TestValidator.predicate(
      "session should have a valid id",
      () => typeof firstSession.id === "string" && firstSession.id.length > 0,
    );

    TestValidator.predicate(
      "session should have a valid moderator id",
      () => firstSession.community_forum_moderator_id === moderator.id,
    );

    TestValidator.predicate(
      "session should have ip, href, and referrer fields",
      () =>
        typeof firstSession.ip === "string" &&
        typeof firstSession.href === "string" &&
        typeof firstSession.referrer === "string",
    );

    TestValidator.predicate(
      "session should have created_at timestamp",
      () =>
        typeof firstSession.created_at === "string" &&
        firstSession.created_at.length > 0,
    );

    // When filtering for active sessions, expired_at should be null
    TestValidator.predicate(
      "active sessions should have null expired_at",
      () => firstSession.expired_at === null,
    );
  }

  // Step 9: Test with different filters
  // Test expired sessions filter (should be empty for a new moderator)
  const expiredSessionsRequest = {
    page: 1,
    limit: 10,
    status: "expired" as const,
  } satisfies ICommunityForumCommunityModeratorSession.IRequest;

  const expiredSessions: IPageICommunityForumCommunityModeratorSession.ISummary =
    await api.functional.communityForum.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: expiredSessionsRequest,
      },
    );
  typia.assert(expiredSessions);

  TestValidator.predicate(
    "expired sessions count should be 0 for new moderator",
    () => expiredSessions.pagination.records === 0,
  );

  TestValidator.equals(
    "expired sessions data array should be empty",
    expiredSessions.data,
    [],
  );
}
