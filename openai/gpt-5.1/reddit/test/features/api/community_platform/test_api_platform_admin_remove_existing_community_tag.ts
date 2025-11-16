import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityTag";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can remove an existing community tag.
 *
 * Business flow covered:
 *
 * 1. Platform admin joins (self-registration) and becomes authenticated.
 * 2. Platform admin creates a community visibility level with a unique code.
 * 3. Member user joins and logs in.
 * 4. Member user creates a community using the created visibility level code.
 * 5. Switch back to platform admin and create a tag for that community.
 * 6. Call DELETE erase endpoint to remove the tag association.
 * 7. Call erase again to confirm that the first delete took effect by expecting an
 *    error on the second delete (without checking HTTP status codes).
 */
export async function test_api_platform_admin_remove_existing_community_tag(
  connection: api.IConnection,
) {
  // 1. Platform admin self-registration (join) to obtain platformAdmin context
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.alphaNumeric(8),
    href: typia.assert<string & tags.Format<"uri">>(
      "https://admin.example.com/register",
    ),
    referrer: typia.assert<string & tags.Format<"uri">>(
      "https://admin.example.com/landing",
    ),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Platform admin creates a visibility level that communities can use
  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);
  TestValidator.equals(
    "visibility level code in response matches create request",
    visibility.code,
    visibilityCode,
  );

  // 3. Member user registration (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: RandomGenerator.alphaNumeric(8),
    href: typia.assert<string & tags.Format<"uri">>(
      "https://community.example.com/register",
    ),
    referrer: typia.assert<string & tags.Format<"uri">>(
      "https://community.example.com/landing",
    ),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 4. Member user explicit login to ensure session change works
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: memberJoinBody.ip,
    href: typia.assert<string & tags.Format<"uri">>(
      "https://community.example.com/login",
    ),
    referrer: typia.assert<string & tags.Format<"uri">>(
      "https://community.example.com/home",
    ),
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);
  TestValidator.equals(
    "member login preserves same member id as join",
    memberAuthorizedFromLogin.id,
    memberAuthorizedFromJoin.id,
  );

  // 5. Member user creates a community using the visibility level code
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(6)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 6 }),
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

  TestValidator.equals(
    "community identifier in response matches request",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility level code matches created visibility level",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 6. Switch back to platform admin via login (to simulate real actor switching)
  const adminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: platformAdminJoinBody.ip,
    href: typia.assert<string & tags.Format<"uri">>(
      "https://admin.example.com/login",
    ),
    referrer: typia.assert<string & tags.Format<"uri">>(
      "https://admin.example.com/dashboard",
    ),
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);
  TestValidator.equals(
    "platform admin login preserves same admin id as join",
    adminAuthorizedFromLogin.id,
    adminAuthorizedFromJoin.id,
  );

  // 7. Platform admin creates a community tag for the created community
  const tagCreateBody = {
    label: RandomGenerator.name(1),
    slug: undefined,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isVisible: true,
    order: undefined,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const createdTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.platformAdmin.communities.tags.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: tagCreateBody,
      },
    );
  typia.assert(createdTag);

  TestValidator.equals(
    "created tag label matches request",
    createdTag.label,
    tagCreateBody.label,
  );

  // 8. Platform admin deletes the existing community tag association
  await api.functional.communityPlatform.platformAdmin.communities.tags.erase(
    connection,
    {
      communityIdentifier: community.identifier,
      tagId: typia.assert<string & tags.Format<"uuid">>(createdTag.id),
    },
  );

  // 9. Call erase again to confirm first deletion took effect by expecting error
  await TestValidator.error(
    "second delete of the same tag association should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.tags.erase(
        connection,
        {
          communityIdentifier: community.identifier,
          tagId: typia.assert<string & tags.Format<"uuid">>(createdTag.id),
        },
      );
    },
  );
}
