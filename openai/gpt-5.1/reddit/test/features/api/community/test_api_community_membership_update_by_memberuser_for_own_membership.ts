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

/**
 * Validate that an authenticated member user can update their own community
 * membership to deactivate (leave) it via the memberUser-scoped update
 * endpoint.
 *
 * Business flow:
 *
 * 1. Create a memberUser account via /auth/memberUser/join and obtain its id and
 *    credentials.
 * 2. Create a platformAdmin account via /auth/platformAdmin/join to perform
 *    admin-only operations.
 * 3. As platformAdmin, create a community visibility level that communities can
 *    reference.
 * 4. As the memberUser, create a community that uses that visibility level.
 * 5. As platformAdmin, create an active membership row in that community for the
 *    memberUser.
 * 6. As the owning memberUser, call the memberUser update endpoint to toggle
 *    is_active from true to false.
 * 7. Verify membership state and associations before and after the update.
 * 8. Call update again with is_active=false to check idempotent/edge behavior
 *    while staying successful.
 */
export async function test_api_community_membership_update_by_memberuser_for_own_membership(
  connection: api.IConnection,
) {
  // 1. Register memberUser (join) and capture credentials + id
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
    ip: "203.0.113.10",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;
  const memberEmail = memberAuthorized.email;
  const memberPassword = memberJoinBody.password;

  // 2. Register platformAdmin (join) and capture credentials + id
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
    ip: "198.51.100.5",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail = adminAuthorized.email;
  const adminPassword = adminJoinBody.password;

  // 3. As platformAdmin (current token), create a visibility level
  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: "Publicly discoverable community visibility level for tests.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibility);

  TestValidator.equals(
    "visibility code should match request",
    visibility.code,
    visibilityCreateBody.code,
  );

  // 4. Switch back to memberUser via login for community creation
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/login-ref",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 5. As memberUser, create a community referencing the visibility level code
  const communityIdentifier = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "E2E Test Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier should match create request",
    community.identifier,
    communityCreateBody.identifier,
  );

  // 6. Switch to platformAdmin again for membership creation
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/login-ref",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 7. As platformAdmin, create a membership for the memberUser in this community
  const membershipCreateBody = {
    memberuser_id: memberId,
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

  TestValidator.equals(
    "created membership should link to correct community",
    createdMembership.community.id,
    community.id,
  );
  TestValidator.equals(
    "created membership should link to correct member user",
    createdMembership.memberuser.id,
    memberId,
  );
  TestValidator.predicate(
    "created membership should be active",
    createdMembership.is_active === true,
  );

  const originalJoinedAt = createdMembership.joined_at;
  const originalCreatedAt = createdMembership.created_at;
  const originalUpdatedAt = createdMembership.updated_at;

  // 8. Switch back to memberUser so that they own the membership update
  const memberLoginForUpdate: ICommunityPlatformMemberuser.ILoginRequest = {
    identifier: memberEmail,
    password: memberPassword,
    href: "https://member.example.com/login2",
    referrer: "https://member.example.com/login-ref2",
  };

  const memberAuthorizedForUpdate: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginForUpdate,
    });
  typia.assert(memberAuthorizedForUpdate);

  // 9. MemberUser updates their own membership to deactivate it
  const firstUpdateBody = {
    is_active: false,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const updatedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.update(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipId: createdMembership.id,
        body: firstUpdateBody,
      },
    );
  typia.assert(updatedMembership);

  // 10. Assert membership state after deactivation
  TestValidator.equals(
    "updated membership should still reference same community",
    updatedMembership.community.id,
    createdMembership.community.id,
  );
  TestValidator.equals(
    "updated membership should still reference same member user",
    updatedMembership.memberuser.id,
    createdMembership.memberuser.id,
  );
  TestValidator.predicate(
    "membership should be inactive after update",
    updatedMembership.is_active === false,
  );
  TestValidator.equals(
    "joined_at must remain unchanged after deactivation",
    updatedMembership.joined_at,
    originalJoinedAt,
  );
  TestValidator.equals(
    "created_at must remain unchanged after deactivation",
    updatedMembership.created_at,
    originalCreatedAt,
  );

  if (
    updatedMembership.ended_at !== null &&
    updatedMembership.ended_at !== undefined
  ) {
    TestValidator.predicate(
      "ended_at should be non-empty string when set",
      updatedMembership.ended_at.length > 0,
    );
  }

  // 11. Edge/idempotence check: update again with is_active=false
  const secondUpdateBody = {
    is_active: false,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const secondUpdatedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.update(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipId: createdMembership.id,
        body: secondUpdateBody,
      },
    );
  typia.assert(secondUpdatedMembership);

  TestValidator.equals(
    "second update should still be inactive",
    secondUpdatedMembership.is_active,
    false,
  );
  TestValidator.equals(
    "second update should preserve community association",
    secondUpdatedMembership.community.id,
    createdMembership.community.id,
  );
  TestValidator.equals(
    "second update should preserve member user association",
    secondUpdatedMembership.memberuser.id,
    createdMembership.memberuser.id,
  );

  if (
    updatedMembership.ended_at !== null &&
    updatedMembership.ended_at !== undefined &&
    secondUpdatedMembership.ended_at !== null &&
    secondUpdatedMembership.ended_at !== undefined
  ) {
    TestValidator.equals(
      "ended_at should remain stable across repeated deactivation",
      secondUpdatedMembership.ended_at,
      updatedMembership.ended_at,
    );
  }
}
