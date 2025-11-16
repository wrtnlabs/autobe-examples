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

export async function test_api_platform_admin_reactivates_inactive_membership(
  connection: api.IConnection,
) {
  // 1. Register and implicitly authenticate as platform admin
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: platformAdminEmail,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorizedJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorizedJoin);

  // 2. Create visibility level as platform admin
  const visibilityCode = "public-reactivation-test";
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Reactivation Test",
    description: "Visibility level used for membership reactivation test.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code matches",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register and implicitly authenticate member user
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: "M3mberP@ssw0rd!",
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create community as member user
  const communityIdentifier = `reactivation-${RandomGenerator.alphaNumeric(8)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Reactivation Test Community",
    description: "Community used to test membership reactivation flow.",
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityIdentifier,
  );

  // 5. Switch back to platform admin via login
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedLogin);

  TestValidator.equals(
    "platform admin id stable",
    platformAdminAuthorizedLogin.id,
    platformAdminAuthorizedJoin.id,
  );

  // 6. Create inactive membership as platform admin
  const membershipCreateBody = {
    memberuser_id: memberAuthorized.id,
    is_active: false,
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
    "created membership is inactive",
    createdMembership.is_active,
    false,
  );

  TestValidator.equals(
    "membership community id matches",
    createdMembership.community.id,
    community.id,
  );

  TestValidator.equals(
    "membership member user id matches",
    createdMembership.memberuser.id,
    memberAuthorized.id,
  );

  const originalUpdatedAt = createdMembership.updated_at;

  // 7. Reactivate membership via update
  const membershipUpdateBody = {
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const reactivatedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.update(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipId: createdMembership.id,
        body: membershipUpdateBody,
      },
    );
  typia.assert(reactivatedMembership);

  TestValidator.equals(
    "membership id stays the same after reactivation",
    reactivatedMembership.id,
    createdMembership.id,
  );

  TestValidator.equals(
    "membership community id unchanged after reactivation",
    reactivatedMembership.community.id,
    community.id,
  );

  TestValidator.equals(
    "membership member user id unchanged after reactivation",
    reactivatedMembership.memberuser.id,
    memberAuthorized.id,
  );

  TestValidator.equals(
    "membership becomes active after reactivation",
    reactivatedMembership.is_active,
    true,
  );

  TestValidator.notEquals(
    "updated_at should change after reactivation",
    reactivatedMembership.updated_at,
    originalUpdatedAt,
  );

  // 8. Idempotent-like behavior: updating again to true should not throw
  const secondUpdateBody = {
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const reactivatedMembershipAgain: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.update(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipId: createdMembership.id,
        body: secondUpdateBody,
      },
    );
  typia.assert(reactivatedMembershipAgain);

  TestValidator.equals(
    "membership remains active after second reactivation",
    reactivatedMembershipAgain.is_active,
    true,
  );
}
