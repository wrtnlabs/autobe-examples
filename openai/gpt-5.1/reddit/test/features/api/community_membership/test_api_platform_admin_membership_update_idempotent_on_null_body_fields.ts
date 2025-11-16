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

export async function test_api_platform_admin_membership_update_idempotent_on_null_body_fields(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (platformAdmin join)
  const platformAdminJoinHref = "https://admin.console.local/join" as string &
    tags.Format<"uri">;
  const platformAdminJoinReferrer =
    "https://admin.console.local/landing" as string & tags.Format<"uri">;

  const platformAdminPassword = RandomGenerator.alphaNumeric(16);

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: platformAdminJoinHref,
        referrer: platformAdminJoinReferrer,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level as platformAdmin
  const visibilityLevelCode = RandomGenerator.alphaNumeric(8);
  const visibilityLevelCreateBody = {
    code: visibilityLevelCode,
    name: RandomGenerator.name(2),
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

  // 3. Create a member user account (memberUser join)
  const memberJoinHref = "https://app.community.local/join" as string &
    tags.Format<"uri">;
  const memberJoinReferrer = "https://app.community.local/landing" as string &
    tags.Format<"uri">;

  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: memberPassword,
    ip: "127.0.0.1",
    href: memberJoinHref,
    referrer: memberJoinReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser, create a community
  const communityIdentifier = RandomGenerator.alphaNumeric(10);
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
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

  // Use identifier from the created community for membership APIs
  const membershipCommunityIdentifier = community.identifier;

  // 5. Switch back to platformAdmin via login so memberships will be created as admin
  const platformAdminLoginHref = "https://admin.console.local/login" as string &
    tags.Format<"uri">;
  const platformAdminLoginReferrer = "https://admin.console.local" as string &
    tags.Format<"uri">;

  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminAuthorized.email,
      password: platformAdminPassword,
      ip: "127.0.0.1",
      href: platformAdminLoginHref,
      referrer: platformAdminLoginReferrer,
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  // 6. Create an active membership in the community for the member user
  const membershipCreateBody = {
    memberuser_id: memberAuthorized.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const createdMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: membershipCommunityIdentifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(createdMembership);

  // Capture baseline lifecycle fields
  const originalMembershipId = createdMembership.id;
  const originalIsActive = createdMembership.is_active;
  const originalJoinedAt = createdMembership.joined_at;
  const originalEndedAt = createdMembership.ended_at ?? null;
  const originalCreatedAt = createdMembership.created_at;
  const originalUpdatedAt = createdMembership.updated_at;

  // 7. Perform a no-op update: send empty body (no is_active field at all)
  const noopUpdateBody =
    {} satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const updatedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.update(
      connection,
      {
        communityIdentifier: membershipCommunityIdentifier,
        membershipId: originalMembershipId,
        body: noopUpdateBody,
      },
    );
  typia.assert(updatedMembership);

  // 8. Assert identity fields and lifecycle fields remain unchanged (except updated_at)
  TestValidator.equals(
    "membership id must remain the same after no-op update",
    updatedMembership.id,
    originalMembershipId,
  );

  TestValidator.equals(
    "community on membership must remain the same",
    updatedMembership.community.id,
    createdMembership.community.id,
  );

  TestValidator.equals(
    "memberuser on membership must remain the same",
    updatedMembership.memberuser.id,
    createdMembership.memberuser.id,
  );

  TestValidator.equals(
    "is_active should remain logically unchanged after no-op update",
    updatedMembership.is_active,
    originalIsActive,
  );

  TestValidator.equals(
    "joined_at should remain the same after no-op update",
    updatedMembership.joined_at,
    originalJoinedAt,
  );

  TestValidator.equals(
    "ended_at should remain the same after no-op update",
    updatedMembership.ended_at ?? null,
    originalEndedAt,
  );

  TestValidator.equals(
    "created_at should remain the same after no-op update",
    updatedMembership.created_at,
    originalCreatedAt,
  );

  // updated_at is allowed to change, but must not go backwards
  const updatedUpdatedAt = updatedMembership.updated_at;
  TestValidator.predicate(
    "updated_at should be greater than or equal to original updated_at",
    () => updatedUpdatedAt >= originalUpdatedAt,
  );

  // 9. Extra predicate: active membership should remain active and not ended
  TestValidator.predicate(
    "membership should still be active after no-op update",
    updatedMembership.is_active === true,
  );

  TestValidator.predicate(
    "active membership should not have ended_at after no-op update",
    () =>
      updatedMembership.ended_at === null ||
      updatedMembership.ended_at === undefined,
  );
}
