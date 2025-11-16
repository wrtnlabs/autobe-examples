import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_community_membership_detail_requires_moderator_authorization(
  connection: api.IConnection,
) {
  // 1. Create core actors: moderator, platform admin, member user
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorPassword = "Moderator#1234";

  const moderatorJoin = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1),
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://community.example.com/moderator/join",
        referrer: "https://community.example.com/",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(moderatorJoin);

  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword = "PlatformAdmin#1234";

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1),
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://community.example.com/platform-admin/join",
        referrer: "https://community.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminJoin);

  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword = "MemberUser#1234";

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://community.example.com/member/join",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  // 2. As platform admin, create visibility level
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminEmail,
      password: platformAdminPassword,
      ip: "127.0.0.1",
      href: "https://community.example.com/platform-admin/login",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const visibilityCode = `visibility_${RandomGenerator.alphaNumeric(8)}`;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);
  TestValidator.equals(
    "created visibility level uses requested code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. As member user, create a community under that visibility level
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://community.example.com/member/login",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);
  TestValidator.equals(
    "community identifier matches input",
    community.identifier,
    communityIdentifier,
  );

  // 4. As member user, create a membership request for that community
  const membershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          questionKey: "why_join",
          answerText: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembershipRequest>(membershipRequest);
  TestValidator.equals(
    "membership request belongs to created community",
    membershipRequest.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership request requester is the joined member user",
    membershipRequest.requesterMemberUser.id,
    memberJoin.id,
  );

  // 5. As community moderator, create a membership for that member user
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: "https://community.example.com/moderator/login",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const membership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          memberuser_id: memberJoin.id,
          is_active: true,
        } satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);
  TestValidator.equals(
    "membership community id matches created community",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership member user id matches member",
    membership.memberuser.id,
    memberJoin.id,
  );
  TestValidator.predicate(
    "membership is active",
    membership.is_active === true,
  );

  const membershipId = membership.id;

  // 6. Unauthenticated access should fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to moderator membership detail should fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.memberships.at(
        unauthenticatedConnection,
        {
          communityIdentifier: community.identifier,
          membershipId,
        },
      );
    },
  );

  // 7. Member user (non-moderator) access should fail
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://community.example.com/member/login",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  await TestValidator.error(
    "member user should not access moderator membership detail endpoint",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.memberships.at(
        connection,
        {
          communityIdentifier: community.identifier,
          membershipId,
        },
      );
    },
  );

  // 8. Moderator access should succeed
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: "https://community.example.com/moderator/login",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const fetchedMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.at(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipId,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(fetchedMembership);

  TestValidator.equals(
    "fetched membership id matches created membership",
    fetchedMembership.id,
    membership.id,
  );
  TestValidator.equals(
    "fetched membership community id matches community",
    fetchedMembership.community.id,
    community.id,
  );
  TestValidator.equals(
    "fetched membership member user id matches member",
    fetchedMembership.memberuser.id,
    memberJoin.id,
  );
  TestValidator.predicate(
    "fetched membership is active",
    fetchedMembership.is_active === true,
  );
}
