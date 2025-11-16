import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that non-moderator member users cannot update a community via the
 * communityModerator-specific update endpoint, while a proper moderator can.
 *
 * Business context:
 *
 * - Communities are created by member users using the memberUser endpoint.
 * - Certain configuration updates are reserved for community moderators via the
 *   communityModerator endpoint.
 * - Role-based access control must prevent regular member users from invoking
 *   moderator-only update operations successfully.
 *
 * Test steps:
 *
 * 1. Register and log in as platformAdmin.
 * 2. As platformAdmin, create a community visibility level master record.
 * 3. Register and log in as memberUser.
 * 4. As memberUser, create a community that uses the created visibility level.
 * 5. While still authenticated as memberUser (not a moderator), attempt to update
 *    the community using the communityModerator update endpoint and assert that
 *    it fails.
 * 6. Register and log in as communityModerator.
 * 7. As communityModerator, successfully update the same community via the
 *    communityModerator update endpoint and verify that the changes are applied
 *    in the response body.
 */
export async function test_api_community_update_by_moderator_permission_denied_for_non_moderator(
  connection: api.IConnection,
) {
  // 1. Register and log in as platformAdmin (join already authenticates)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platformAdmin, create a community visibility level master record
  const visibilityCreateBody = {
    code: `public-${RandomGenerator.alphaNumeric(6)}`,
    name: "Public Visibility",
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

  // 3. Register and log in as memberUser (join already authenticates)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser, create a new community
  const originalTitle = `Original Community ${RandomGenerator.alphaNumeric(6)}`;
  const originalDescription = RandomGenerator.paragraph({ sentences: 5 });

  const createCommunityBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: originalTitle,
    description: originalDescription,
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: createCommunityBody,
      },
    );
  typia.assert(createdCommunity);

  // 5. While authenticated as memberUser, attempt to update using moderator endpoint
  const unauthorizedUpdateBody = {
    title: `Hacked Title ${RandomGenerator.alphaNumeric(4)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_archived: true,
    is_removed: true,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  await TestValidator.error(
    "memberUser cannot update community via communityModerator endpoint",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.update(
        connection,
        {
          communityIdentifier: createdCommunity.identifier,
          body: unauthorizedUpdateBody,
        },
      );
    },
  );

  // Since the unauthorized call failed, we still trust the originally created
  // community as the last successful state. We can assert that the intended
  // hacked values differ from the original to make the contrast explicit.
  TestValidator.notEquals(
    "unauthorized update payload title differs from original title",
    createdCommunity.title,
    unauthorizedUpdateBody.title ?? undefined,
  );

  // 6. Register and log in as communityModerator
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 7. As communityModerator, successfully update the community
  const updatedTitle = `Updated Community ${RandomGenerator.alphaNumeric(6)}`;
  const updatedDescription = RandomGenerator.paragraph({ sentences: 6 });

  const moderatorUpdateBody = {
    title: updatedTitle,
    description: updatedDescription,
    is_archived: false,
    is_removed: false,
    visibility_level_code: visibilityLevel.code,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communityModerator.communities.update(
      connection,
      {
        communityIdentifier: createdCommunity.identifier,
        body: moderatorUpdateBody,
      },
    );
  typia.assert(updatedCommunity);

  TestValidator.equals(
    "moderator update should change community title",
    updatedCommunity.title,
    updatedTitle,
  );
  TestValidator.equals(
    "moderator update should change community description",
    updatedCommunity.description ?? null,
    updatedDescription,
  );
}
