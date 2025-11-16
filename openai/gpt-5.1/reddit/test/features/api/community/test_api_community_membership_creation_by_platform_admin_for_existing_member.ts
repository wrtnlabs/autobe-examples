import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_community_membership_creation_by_platform_admin_for_existing_member(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (join)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: "AdminPassw0rd!",
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.console.test/join",
    referrer: "https://admin.console.test/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorizedFromJoin);

  // 2. Explicitly login as platform admin (to test login + ensure admin context)
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.console.test/login",
    referrer: "https://admin.console.test/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedFromLogin);

  // 3. Register a member user (join)
  const memberUserJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(10)}@member.test.com` as string &
      tags.Format<"email">,
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://community.test/join",
    referrer: "https://community.test/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuthorizedFromJoin);

  const memberUserId: string & tags.Format<"uuid"> =
    memberUserAuthorizedFromJoin.id;

  // 4. Switch back to platform admin via login for admin-side operations
  const platformAdminAuthorizedForAdminOps: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedForAdminOps);

  // 5. As platform admin, create a visibility level
  const visibilityCodeBase = RandomGenerator.alphabets(8);
  const visibilityLevelCreateBody = {
    code: `test-${visibilityCodeBase}`,
    name: `Test Visibility ${visibilityCodeBase}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code should match request",
    visibilityLevel.code,
    visibilityLevelCreateBody.code,
  );
  TestValidator.equals(
    "visibility level name should match request",
    visibilityLevel.name,
    visibilityLevelCreateBody.name,
  );

  // 6. Switch to member user for community creation
  const memberUserLoginBody = {
    identifier: memberUserJoinBody.email,
    password: memberUserJoinBody.password,
    ip: null,
    href: "https://community.test/login",
    referrer: "https://community.test/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberUserAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberUserLoginBody,
    });
  typia.assert(memberUserAuthorizedFromLogin);

  // 7. As member user, create a community using the newly created visibility level
  const communityIdentifier = `test-community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier should match request",
    community.identifier,
    communityCreateBody.identifier,
  );
  TestValidator.equals(
    "community title should match request",
    community.title,
    communityCreateBody.title,
  );
  TestValidator.equals(
    "community visibilityLevel.code should match requested code",
    community.visibilityLevel.code,
    visibilityLevel.code,
  );

  // 8. Switch back to platform admin for membership creation
  const platformAdminAuthorizedBeforeMembership: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedBeforeMembership);

  // 9. As platform admin, create a membership for the member user in this community
  const membershipCreateBody = {
    memberuser_id: memberUserId,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // Business validations on membership
  TestValidator.equals(
    "membership should reference the created community by id",
    membership.community.id,
    community.id,
  );
  TestValidator.predicate(
    "membership community slug should be non-empty",
    membership.community.slug.length > 0,
  );
  TestValidator.equals(
    "membership memberuser id should match the member user id",
    membership.memberuser.id,
    memberUserId,
  );
  TestValidator.equals(
    "membership should be active",
    membership.is_active,
    true,
  );
  TestValidator.predicate(
    "membership joined_at should be a non-empty string",
    membership.joined_at.length > 0,
  );
  TestValidator.equals(
    "ended_at should be null for an active membership",
    membership.ended_at ?? null,
    null,
  );

  // 10. Optional: verify duplicate membership creation fails
  await TestValidator.error(
    "duplicate membership creation should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
        connection,
        {
          communityIdentifier: community.identifier,
          body: membershipCreateBody,
        },
      );
    },
  );
}
