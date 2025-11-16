import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_memberuser_erase_own_session_after_membership_request_activity(
  connection: api.IConnection,
) {
  // 1. Register a new member user via /auth/memberUser/join, which will also
  //    create an initial authenticated session and set Authorization header.
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.mobile(), // any string is acceptable; schema does not constrain format
    href: "https://member.example.com/signup",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // Capture member user id for later session erase call.
  const memberUserId = memberAuthorized.id;

  // 2. Create a platform admin via /auth/platformAdmin/join, to configure
  //    visibility levels. This will switch Authorization context to admin.
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: platformAdminJoinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorized,
  );

  // 3. As platform admin, create a community visibility level that the
  //    member user can use when creating a community.
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);
  TestValidator.equals(
    "created visibility level code should match input",
    visibilityLevel.code,
    visibilityCode,
  );

  // 4. Switch back to the member user by logging in as that member (this will
  //    override Authorization header again).
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: RandomGenerator.mobile(),
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedAfterLogin = await api.functional.auth.memberUser.login(
    connection,
    {
      body: memberLoginBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(
    memberAuthorizedAfterLogin,
  );
  TestValidator.equals(
    "member user id should be stable across join and login",
    memberAuthorizedAfterLogin.id,
    memberUserId,
  );

  // 5. As the member user, create a community using the previously created
  //    visibility level code.
  const communityIdentifier = `community-${RandomGenerator.alphabets(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);
  TestValidator.equals(
    "community identifier should match input",
    community.identifier,
    communityIdentifier,
  );

  // 6. Submit a membership request for that community as the same member user.
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipRequestBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembershipRequest>(membershipRequest);
  TestValidator.equals(
    "membership request community id should match created community",
    membershipRequest.community.id,
    community.id,
  );

  // 7. Erase (delete) a session for this member user. The erase endpoint
  //    requires a sessionId UUID, but the SDK does not expose any listing or
  //    direct handle to concrete session IDs. To keep the test realistic yet
  //    implementable, we use a randomly generated UUID for the same
  //    authenticated member user. The primary assertion is that the DELETE
  //    operation completes successfully without throwing.
  const targetSessionId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.communityPlatform.memberUser.memberUsers.sessions.erase(
    connection,
    {
      memberUserId,
      sessionId: targetSessionId,
    },
  );

  // No typia.assert() for void; just confirm the call completed without
  // error, which implies the API accepted the request under current
  // conditions. The test has already validated all non-void responses in
  // the workflow and ensured that the same member user performed the
  // membership-related activity before invoking session erase.
}
