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
 * Validate community creation with a valid visibility level.
 *
 * Business intent:
 *
 * - Ensure that when a platform administrator has configured a community
 *   visibility level, an authenticated member user can create a new community
 *   that references this visibility level by its business code.
 * - Verify that the created community record correctly reflects the input payload
 *   and links to the creator and visibility level metadata.
 *
 * Scenario steps:
 *
 * 1. Register a platform admin (platformAdmin.join) to obtain platform-level
 *    privileges and an authenticated session.
 * 2. As this platform admin, create a new visibility level via
 *    communityVisibilityLevels.create using a unique business code.
 * 3. Register a member user (memberUser.join) to obtain a memberUser actor and an
 *    authenticated session; this implicitly switches the connection actor.
 * 4. As the member user, create a community via
 *    communityPlatform.memberUser.communities.create referencing the created
 *    visibility level code.
 * 5. Assert that the returned community:
 *
 *    - Has a non-empty UUID id.
 *    - Echoes the identifier, title, and description from the request.
 *    - Has visibilityLevel.code equal to the requested visibilityLevelCode.
 *    - Has is_archived === false and is_removed === false.
 *    - Has creator summary matching the joined member user.
 */
export async function test_api_community_creation_with_valid_visibility_level(
  connection: api.IConnection,
) {
  // 1. Register platform admin and become authenticated as platformAdmin
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level as platformAdmin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevelCreateBody = {
    code: visibilityCode,
    name: "Public Community",
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

  TestValidator.equals(
    "visibility level code should match requested code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register a member user and become authenticated as memberUser
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(16),
    ip: "203.0.113.10",
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create a community as memberUser referencing the created visibility level
  const communityIdentifier = `programming-${RandomGenerator.alphaNumeric(6)}`;
  const communityTitle = "Programming Discussions";
  const communityDescription = RandomGenerator.paragraph({ sentences: 8 });

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: communityTitle,
    description: communityDescription,
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. Business assertions on the created community
  TestValidator.equals(
    "community identifier should equal request identifier",
    community.identifier,
    communityIdentifier,
  );

  TestValidator.equals(
    "community title should equal request title",
    community.title,
    communityTitle,
  );

  TestValidator.equals(
    "community description should equal request description",
    community.description ?? undefined,
    communityDescription,
  );

  TestValidator.equals(
    "community visibilityLevel.code should equal requested visibilityLevelCode",
    community.visibilityLevel.code,
    visibilityCode,
  );

  TestValidator.predicate(
    "newly created community should not be archived",
    community.is_archived === false,
  );

  TestValidator.predicate(
    "newly created community should not be removed",
    community.is_removed === false,
  );

  TestValidator.equals(
    "community creator id should match member user id",
    community.creator.id,
    memberAuthorized.id,
  );

  TestValidator.equals(
    "community creator username should match member user username",
    community.creator.username,
    memberAuthorized.username,
  );
}
