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
 * Validate that a member user cannot delete a non-existent membership in a
 * community.
 *
 * Business goal:
 *
 * - Ensure DELETE
 *   /communityPlatform/memberUser/communities/{communityIdentifier}/memberships/{membershipId}
 *   fails with an error when the specified membershipId does not belong to the
 *   target community (or does not exist at all), and that the API does not
 *   treat such a request as a success.
 *
 * High level flow:
 *
 * 1. Create and authenticate a member user actor (who will attempt the deletion).
 * 2. Create and authenticate a platform admin actor, then create a visibility
 *    level.
 * 3. Switch back to the member user context and create a community using the
 *    created visibility level.
 * 4. Without creating any membership rows for that community, attempt to delete a
 *    fabricated membershipId for that community via the memberUser endpoint.
 * 5. Assert that the DELETE call fails (throws) using TestValidator.error,
 *    confirming that the backend correctly rejects deletion of a non-existent
 *    membership.
 *
 * Constraints and notes:
 *
 * - Use only the provided SDK functions and DTOs; do not assume any extra
 *   membership listing or creation APIs.
 * - Do not test HTTP status codes directly; only check that an error is thrown.
 * - Do not create any membership for the community in this test; we are
 *   explicitly testing the non-existent membership path.
 * - Do not manipulate connection.headers directly; rely on auth endpoints to set
 *   Authorization header.
 * - Use typia.random and RandomGenerator utilities to generate realistic but
 *   type-safe fake identifiers and payload data.
 */
export async function test_api_member_user_cannot_delete_nonexistent_membership(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user (join automatically authenticates)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register and authenticate a platform admin, then create a visibility level
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://community.example.com/admin/join",
    referrer: "https://community.example.com/admin/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Create a visibility level as platform admin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
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
  TestValidator.equals(
    "created visibility level code should match",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Switch back to member user authentication context using login
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 4. Create a community as member user with the previously created visibility level
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
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
    "created community identifier should match",
    community.identifier,
    communityIdentifier,
  );

  // 5. Attempt to delete a non-existent membership
  // Generate a fabricated membershipId that should not exist for this community
  const fakeMembershipId = RandomGenerator.alphaNumeric(24);

  await TestValidator.error(
    "deleting a non-existent membership should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.memberships.erase(
        connection,
        {
          communityIdentifier: community.identifier,
          membershipId: fakeMembershipId,
        },
      );
    },
  );
}
