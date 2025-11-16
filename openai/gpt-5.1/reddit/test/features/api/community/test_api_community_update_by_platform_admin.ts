import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_community_update_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) and stay authenticated as platformAdmin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = "AdminPassw0rd!";

  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorized,
  );

  // 2. As platform admin, create a new visibility level
  const visibilityCode = `e2e_visibility_${RandomGenerator.alphaNumeric(8)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "E2E Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register member user (join) — this will switch Authorization to memberUser
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword = "MemberPassw0rd!";

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 4. Member user creates a community
  const communityIdentifier = `e2e-update-community-${RandomGenerator.alphaNumeric(8)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Original Community Title",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    // We omit primaryTagIds because it's optional and we have no tag master
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(createdCommunity);

  TestValidator.equals(
    "created community identifier matches",
    createdCommunity.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "created community visibility code matches initial",
    createdCommunity.visibilityLevel.code,
    visibilityCode,
  );

  const originalId = createdCommunity.id;
  const originalIdentifier = createdCommunity.identifier;
  const originalIdentifierNormalized = createdCommunity.identifier_normalized;
  const originalCreatedAt = createdCommunity.created_at;
  const originalIsRemoved = createdCommunity.is_removed;

  // 5. Switch back to platform admin via login
  const platformAdminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminLoginResult,
  );

  // 6. Platform admin updates the community
  const updatedTitle = "Updated Community Title by Admin";
  const updatedDescription = RandomGenerator.paragraph({ sentences: 6 });
  const updatedRulesSummary = "No spam, be respectful, follow guidelines.";

  const updateBody = {
    title: updatedTitle,
    description: updatedDescription,
    rules_summary: updatedRulesSummary,
    is_archived: true,
    // keep same visibility level code, but still exercise the field
    visibility_level_code: visibilityCode,
    // do not touch is_removed here (it should remain unchanged)
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.platformAdmin.communities.update(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(updatedCommunity);

  // 7. Validate business rules on updated community
  TestValidator.equals(
    "community id must remain unchanged after update",
    updatedCommunity.id,
    originalId,
  );
  TestValidator.equals(
    "community identifier must remain unchanged after update",
    updatedCommunity.identifier,
    originalIdentifier,
  );
  TestValidator.equals(
    "community normalized identifier must remain unchanged after update",
    updatedCommunity.identifier_normalized,
    originalIdentifierNormalized,
  );
  TestValidator.equals(
    "created_at must remain unchanged after update",
    updatedCommunity.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "is_removed must remain unchanged after update",
    updatedCommunity.is_removed,
    originalIsRemoved,
  );

  TestValidator.equals(
    "updated title must be applied",
    updatedCommunity.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated description must be applied",
    updatedCommunity.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated rules summary must be applied",
    updatedCommunity.rules_summary,
    updatedRulesSummary,
  );
  TestValidator.equals(
    "updated is_archived flag must be true",
    updatedCommunity.is_archived,
    true,
  );
  TestValidator.equals(
    "visibility level code must remain valid and equal to chosen code",
    updatedCommunity.visibilityLevel.code,
    visibilityCode,
  );

  // 8. Ensure member user cannot update via platformAdmin endpoint
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginResult);

  const forbiddenUpdateBody = {
    title: "Member should not be able to apply this title",
  } satisfies ICommunityPlatformCommunity.IUpdate;

  await TestValidator.error(
    "member user must not be allowed to update community via platform admin endpoint",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.update(
        connection,
        {
          communityIdentifier: communityIdentifier,
          body: forbiddenUpdateBody,
        },
      );
    },
  );
}
