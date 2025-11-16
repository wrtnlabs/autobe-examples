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

/**
 * Validate platformAdmin-driven community visibility transitions and permission
 * boundaries.
 *
 * Business goals:
 *
 * - Ensure a community’s visibility can be changed from one valid visibility
 *   level to another by a platform administrator.
 * - Ensure only existing visibility level codes can be used.
 * - Ensure member users cannot invoke the admin-only visibility update endpoint.
 *
 * Scenario steps:
 *
 * 1. Platform admin registration and implicit authentication.
 * 2. Creation of two visibility levels (PUBLIC and RESTRICTED) by the platform
 *    admin.
 * 3. Member user registration and implicit authentication.
 * 4. Member user creates a community with the PUBLIC visibility level.
 * 5. Platform admin updates that community’s visibility to RESTRICTED.
 * 6. Validate that the updated community reflects the new visibility level.
 * 7. Validate that a member user cannot perform the same update.
 */
export async function test_api_community_update_visibility_transition_rules(
  connection: api.IConnection,
) {
  // 1. Register and implicitly authenticate platform admin
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminUsername: string = RandomGenerator.alphabets(12);

  const platformAdminJoinOutput: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: platformAdminUsername,
        email: platformAdminEmail,
        password: "AdminPass123!",
        displayName: RandomGenerator.name(2),
        ip: "127.0.0.1",
        href: "https://admin.console.join/",
        referrer: "https://landing.page/",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoinOutput);

  // 2. Create two visibility levels as platform admin: PUBLIC and RESTRICTED
  const publicVisibilityCode = "public_" + RandomGenerator.alphaNumeric(8);
  const restrictedVisibilityCode =
    "restricted_" + RandomGenerator.alphaNumeric(8);

  const publicVisibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: publicVisibilityCode,
          name: "Public Visibility",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(publicVisibilityLevel);

  const restrictedVisibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: restrictedVisibilityCode,
          name: "Restricted Visibility",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(restrictedVisibilityLevel);

  // 3. Register and implicitly authenticate member user
  const memberUserEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUserUsername: string = RandomGenerator.alphabets(10);

  const memberJoinOutput: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUserUsername,
        email: memberUserEmail,
        password: "MemberPass123!",
        ip: "127.0.0.1",
        href: "https://community.app/join",
        referrer: "https://marketing.page/",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoinOutput);

  // 4. As member user, create a community with PUBLIC visibility
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibilityLevelCode: publicVisibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  TestValidator.equals(
    "created community uses PUBLIC visibility",
    createdCommunity.visibilityLevel.code,
    publicVisibilityCode,
  );
  TestValidator.equals(
    "created community identifier matches request",
    createdCommunity.identifier,
    communityIdentifier,
  );

  // 5. Re-authenticate as platform admin to ensure admin context
  const platformAdminLoginOutput: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password: "AdminPass123!",
        ip: "127.0.0.1",
        href: "https://admin.console.login/",
        referrer: "https://landing.page/login",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLoginOutput);

  // 6. Platform admin updates community visibility from PUBLIC to RESTRICTED
  const updatedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.platformAdmin.communities.update(
      connection,
      {
        communityIdentifier,
        body: {
          visibility_level_code: restrictedVisibilityCode,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);

  // 7. Validate that the updated community reflects RESTRICTED visibility
  TestValidator.equals(
    "updated community identifier remains unchanged",
    updatedCommunity.identifier,
    createdCommunity.identifier,
  );

  TestValidator.equals(
    "updated community now uses RESTRICTED visibility code",
    updatedCommunity.visibilityLevel.code,
    restrictedVisibilityCode,
  );

  TestValidator.equals(
    "updated community visibility name matches RESTRICTED visibility level",
    updatedCommunity.visibilityLevel.name,
    restrictedVisibilityLevel.name,
  );

  // 8. Negative auth check: member user must not be able to call admin update
  const memberLoginOutput: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberUserEmail,
        password: "MemberPass123!",
        ip: "127.0.0.1",
        href: "https://community.app/login",
        referrer: "https://marketing.page/login",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberLoginOutput);

  await TestValidator.error(
    "memberUser cannot call platformAdmin community update endpoint",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.update(
        connection,
        {
          communityIdentifier,
          body: {
            visibility_level_code: publicVisibilityCode,
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );
}
