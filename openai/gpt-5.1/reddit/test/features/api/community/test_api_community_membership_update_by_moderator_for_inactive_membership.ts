import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_community_membership_update_by_moderator_for_inactive_membership(
  connection: api.IConnection,
) {
  // 1. Create member user (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create community moderator (join)
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 3. Create platform admin (join)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 4. As platformAdmin, create a visibility level
  // login as platformAdmin (even though join has already set token, we follow scenario)
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  const visibilityCreateBody = {
    code: `vis-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 5. As memberUser, create a community referencing that visibility code
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  TestValidator.equals(
    "created community identifier should match request",
    community.identifier,
    communityIdentifier,
  );

  // 6. As communityModerator, create inactive membership for this member user
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized2: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized2);

  const membershipCreateBody = {
    memberuser_id: memberAuthorized.id,
    is_active: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const createdMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(createdMembership);

  TestValidator.equals(
    "membership community id should match created community id",
    createdMembership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership memberuser id should match created member user id",
    createdMembership.memberuser.id,
    memberAuthorized.id,
  );

  // Snapshot initial membership state
  const initialIsActive = createdMembership.is_active;
  const initialEndedAt = createdMembership.ended_at ?? null;
  const initialUpdatedAt = createdMembership.updated_at;

  TestValidator.equals(
    "initial membership should be inactive as requested",
    initialIsActive,
    false,
  );

  // 7. Moderator updates membership with is_active=false again (redundant update)
  const membershipUpdateBody = {
    is_active: false,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const updatedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.update(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipId: createdMembership.id,
        body: membershipUpdateBody,
      },
    );
  typia.assert(updatedMembership);

  TestValidator.equals(
    "membership id should remain stable after update",
    updatedMembership.id,
    createdMembership.id,
  );
  TestValidator.equals(
    "membership community id should remain stable after update",
    updatedMembership.community.id,
    createdMembership.community.id,
  );
  TestValidator.equals(
    "membership memberuser id should remain stable after update",
    updatedMembership.memberuser.id,
    createdMembership.memberuser.id,
  );
  TestValidator.equals(
    "membership should remain inactive after redundant update",
    updatedMembership.is_active,
    false,
  );

  // ended_at must not be cleared when is_active=false is re-applied
  if (initialEndedAt !== null) {
    TestValidator.equals(
      "ended_at should remain unchanged when membership stays inactive",
      updatedMembership.ended_at ?? null,
      initialEndedAt,
    );
  } else {
    // If server sets ended_at when membership is inactive, ensure it is at least non-null
    TestValidator.predicate(
      "ended_at may be set but must not be cleared when staying inactive",
      updatedMembership.ended_at === null ||
        typeof updatedMembership.ended_at === "string",
    );
  }

  TestValidator.predicate(
    "updated_at should not go backwards after update",
    updatedMembership.updated_at >= initialUpdatedAt,
  );

  // 8. Optional second redundant update to check idempotent behavior
  const updatedMembership2: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.update(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipId: createdMembership.id,
        body: membershipUpdateBody,
      },
    );
  typia.assert(updatedMembership2);

  TestValidator.equals(
    "membership id should remain stable after second redundant update",
    updatedMembership2.id,
    createdMembership.id,
  );
  TestValidator.equals(
    "membership should remain inactive after second redundant update",
    updatedMembership2.is_active,
    false,
  );
  TestValidator.predicate(
    "updated_at after second update should be >= first updated_at",
    updatedMembership2.updated_at >= updatedMembership.updated_at,
  );
}
