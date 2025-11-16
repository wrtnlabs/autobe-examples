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
 * Validate community update behavior for moderator when faced with invalid and
 * valid payloads.
 *
 * Business intent:
 *
 * - Ensure that PUT
 *   /communityPlatform/communityModerator/communities/{communityIdentifier}
 *   rejects updates that violate business validation (e.g., using a visibility
 *   level code that does not exist) and does not produce a successful updated
 *   community representation.
 * - Confirm that the same endpoint successfully applies changes when provided
 *   with a valid ICommunityPlatformCommunity.IUpdate payload.
 *
 * Scenario outline:
 *
 * 1. As platformAdmin, create a visibility level master record that communities
 *    can reference.
 * 2. As memberUser, join and immediately create a community referencing the
 *    visibility level created in step 1.
 * 3. As communityModerator, join and log in to obtain a moderator session.
 * 4. Attempt an invalid community update using a non-existent visibility level
 *    code; assert that an error is thrown.
 * 5. Perform a valid update (e.g., change title and description) while keeping the
 *    visibility level code valid; assert that the update succeeds and returns
 *    an updated community object.
 */
export async function test_api_community_update_by_moderator_invalid_updates_validation(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and logs in to create a visibility level
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.community.local/register",
    referrer: "https://admin.community.local/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Explicit login step (even though join already authenticated) to satisfy
  // dependency description and ensure token switching semantics are exercised.
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.community.local/login",
    referrer: "https://admin.community.local/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  // 1-b. Create a visibility level as platformAdmin
  const visibilityCodeBase = RandomGenerator.alphabets(10);
  const visibilityCreateBody = {
    code: visibilityCodeBase,
    name: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 2. Member user joins and creates a community referencing the visibility level
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://community.local/signup",
    referrer: "https://community.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const communityIdentifier = RandomGenerator.alphabets(8);
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCreateBody.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const originalCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(originalCommunity);

  // 3. Community moderator joins and logs in
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://community.local/moderator/join",
    referrer: "https://community.local/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://community.local/moderator/login",
    referrer: "https://community.local/",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginResult: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginResult);

  // 4. Attempt invalid update with non-existent visibility_level_code
  const invalidVisibilityCode = `${visibilityCreateBody.code}_invalid`;
  const invalidUpdateBody = {
    visibility_level_code: invalidVisibilityCode,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  await TestValidator.error(
    "community update with non-existent visibility_level_code should fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.update(
        connection,
        {
          communityIdentifier: originalCommunity.identifier,
          body: invalidUpdateBody,
        },
      );
    },
  );

  // 5. Perform a valid update using correct visibility level code and new title/description
  const validUpdateBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibility_level_code: visibilityCreateBody.code,
    is_archived: false,
    is_removed: false,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communityModerator.communities.update(
      connection,
      {
        communityIdentifier: originalCommunity.identifier,
        body: validUpdateBody,
      },
    );
  typia.assert(updatedCommunity);

  // Logical assertions comparing original and updated communities
  TestValidator.equals(
    "community identifier should remain unchanged after update",
    updatedCommunity.identifier,
    originalCommunity.identifier,
  );

  TestValidator.notEquals(
    "community title should change after valid update",
    updatedCommunity.title,
    originalCommunity.title,
  );

  TestValidator.notEquals(
    "community description should change after valid update",
    updatedCommunity.description,
    originalCommunity.description,
  );

  TestValidator.equals(
    "visibility level code should remain valid and unchanged from creation",
    updatedCommunity.visibilityLevel.code,
    visibilityLevel.code,
  );
}
