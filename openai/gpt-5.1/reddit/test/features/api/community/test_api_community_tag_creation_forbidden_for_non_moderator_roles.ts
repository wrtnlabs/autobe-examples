import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityTag";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that only community moderators can create community tags via the
 * moderator endpoint, and that guests and member users are forbidden.
 *
 * Business workflow:
 *
 * 1. A platform admin registers and provisions a visibility level that communities
 *    can use.
 * 2. A member user registers and creates a community using that visibility level.
 * 3. A guest (no Authorization header) attempts to create a community tag via the
 *    communityModerator endpoint and must be rejected.
 * 4. The member user (authenticated) attempts the same moderator endpoint and must
 *    also be rejected.
 * 5. A community moderator registers (and logs in if needed) and successfully
 *    creates a community tag via the moderator endpoint.
 *
 * The test ensures role-based access control for POST
 * /communityPlatform/communityModerator/communities/{communityIdentifier}/tags.
 */
export async function test_api_community_tag_creation_forbidden_for_non_moderator_roles(
  connection: api.IConnection,
) {
  // 1. Platform admin registers and provisions a visibility level
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: platformAdminEmail,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const visibilityLevelBody = {
    code: `vl-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelBody },
    );
  typia.assert(visibilityLevel);

  // 2. Member user registers and creates a community
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: memberPassword,
    ip: undefined,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Ensure we have a fresh member login context (even though join already set token)
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: undefined,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  const communityIdentifier = `comm-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
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
    "created community identifier matches requested identifier",
    community.identifier,
    communityIdentifier,
  );

  // Prepare a common tag creation payload
  const tagCreateBody = {
    label: `Tag ${RandomGenerator.name(1)}`,
    slug: undefined,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isVisible: true,
    order: undefined,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  // 3. Guest (no Authorization header) attempts moderator tag creation
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "guest must be forbidden to create community tags via moderator endpoint",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.tags.create(
        guestConnection,
        {
          communityIdentifier: community.identifier,
          body: tagCreateBody,
        },
      );
    },
  );

  // 4. Authenticated member user attempts moderator tag creation and must be forbidden
  const memberOnlyConnection: api.IConnection = { ...connection };

  // Ensure member auth token is active on this cloned connection
  await api.functional.auth.memberUser.login(memberOnlyConnection, {
    body: memberLoginBody,
  });

  await TestValidator.error(
    "memberUser must be forbidden to create community tags via moderator endpoint",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.tags.create(
        memberOnlyConnection,
        {
          communityIdentifier: community.identifier,
          body: tagCreateBody,
        },
      );
    },
  );

  // 5. Community moderator registers/logs in and successfully creates a tag
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorPassword: string = RandomGenerator.alphaNumeric(12);

  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: null,
    ip: undefined,
    href: "https://mod.example.com/register",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: undefined,
    href: "https://mod.example.com/login",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  const tagCreated: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: tagCreateBody,
      },
    );
  typia.assert(tagCreated);

  TestValidator.equals(
    "created tag label matches requested label",
    tagCreated.label,
    tagCreateBody.label,
  );
}
