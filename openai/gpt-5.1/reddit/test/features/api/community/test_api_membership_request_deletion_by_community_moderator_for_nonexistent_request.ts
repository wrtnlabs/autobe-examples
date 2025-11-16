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

export async function test_api_membership_request_deletion_by_community_moderator_for_nonexistent_request(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and becomes authenticated
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin creates a visibility level master
  const visibilityCodeBase = "public_" + RandomGenerator.alphabets(8);
  const visibilityLevelBody = {
    code: visibilityCodeBase,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Member user joins and becomes authenticated
  const memberUserJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUser);

  // 4. Member user creates a community using the created visibility level
  const communityIdentifier = RandomGenerator.alphabets(12);
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
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

  // Sanity check: created community identifier matches the requested one
  TestValidator.equals(
    "created community identifier should match the requested identifier",
    community.identifier,
    communityIdentifier,
  );

  // 5. Community moderator joins and becomes authenticated
  const communityModeratorJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModerator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(communityModerator);

  // 6. Prepare a non-existent membershipRequestId (never used in this scenario)
  const nonExistentMembershipRequestId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 7. Attempt to delete a non-existent membership request as community moderator
  await TestValidator.error(
    "deleting non-existent membership request should fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.membershipRequests.erase(
        connection,
        {
          communityIdentifier: community.identifier,
          membershipRequestId: nonExistentMembershipRequestId,
        },
      );
    },
  );
}
