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

export async function test_api_platform_admin_updates_active_membership_status(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) and obtain authenticated admin context
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphabets(10),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level as platform admin
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Public ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register a member user (join) and obtain authenticated member context
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphabets(10),
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create a community as the member user
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. Switch back to platform admin context using login (to mimic real-world actor switching)
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: platformAdminJoinBody.ip,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 6. Create an active community membership for the member user in the created community
  const membershipCreateBody = {
    memberuser_id: memberAuthorized.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const createdMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(createdMembership);

  TestValidator.predicate(
    "created membership should be active",
    createdMembership.is_active === true,
  );

  // Capture original timestamps and ids for later comparison
  const originalMembershipId = createdMembership.id;
  const originalCommunityId = createdMembership.community.id;
  const originalMemberUserId = createdMembership.memberuser.id;
  const originalCreatedAt = createdMembership.created_at;
  const originalUpdatedAt = createdMembership.updated_at;

  // 7. Update membership is_active to false via platform admin update endpoint
  const membershipUpdateBody = {
    is_active: false,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const updatedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.update(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipId: createdMembership.id,
        body: membershipUpdateBody,
      },
    );
  typia.assert(updatedMembership);

  // 8. Assertions on updated membership
  TestValidator.equals(
    "membership id should remain stable after update",
    updatedMembership.id,
    originalMembershipId,
  );

  TestValidator.equals(
    "community association should remain stable",
    updatedMembership.community.id,
    originalCommunityId,
  );

  TestValidator.equals(
    "member user association should remain stable",
    updatedMembership.memberuser.id,
    originalMemberUserId,
  );

  TestValidator.predicate(
    "membership should be inactive after update",
    updatedMembership.is_active === false,
  );

  // Ensure created_at is unchanged
  TestValidator.equals(
    "created_at should not change after status update",
    updatedMembership.created_at,
    originalCreatedAt,
  );

  // Ensure updated_at is >= originalUpdatedAt (lexicographical comparison valid for ISO timestamps)
  TestValidator.predicate(
    "updated_at should be greater than or equal to original updated_at",
    updatedMembership.updated_at >= originalUpdatedAt,
  );
}
