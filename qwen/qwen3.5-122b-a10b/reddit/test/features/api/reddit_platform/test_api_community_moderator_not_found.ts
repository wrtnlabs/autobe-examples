import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

/**
 * Test that retrieving a moderator assignment returns an appropriate error
 * when the moderator ID does not exist for the given community.
 *
 * This test validates that when a valid community ID is provided but with a
 * moderator member ID that has not been assigned to that community, the system
 * returns a 404 or equivalent error indicating the moderator assignment was not found.
 */
export async function test_api_community_moderator_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account and authenticate (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(ownerConnection, {
      body: typia.assert<IRedditPlatformMember.IJoin>({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      }),
    });
  typia.assert(ownerAuth);
  // 2. Create a community with first member as owner
  const community: IRedditPlatformCommunity =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create second member account (will NOT be a moderator)
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModeratorAuth: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(nonModeratorConnection, {
      body: typia.assert<IRedditPlatformMember.IJoin>({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      }),
    });
  typia.assert(nonModeratorAuth);
  // 4. Create third member and add as actual moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(moderatorConnection, {
      body: typia.assert<IRedditPlatformMember.IJoin>({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      }),
    });
  typia.assert(moderatorAuth);
  // Add third member as moderator
  const moderatorAssignment: IRedditPlatformCommunityModerator =
    await generate_random_reddit_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: moderatorAuth.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Attempt to retrieve moderator assignment using second member's ID (should fail)
  await TestValidator.httpError(
    "retrieving non-existent moderator assignment should return 404",
    404,
    async () => {
      await api.functional.redditPlatform.communities.moderators.at(
        connection,
        {
          communityId: community.id,
          moderatorId: nonModeratorAuth.id,
        },
      );
    },
  );
  // 6. Verify that the actual moderator can be retrieved successfully
  const actualModerator: IRedditPlatformCommunityModerator =
    await api.functional.redditPlatform.communities.moderators.at(connection, {
      communityId: community.id,
      moderatorId: moderatorAuth.id,
    });
  typia.assert(actualModerator);
  TestValidator.equals(
    "retrieved moderator matches created moderator",
    actualModerator.member.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "retrieved community matches created community",
    actualModerator.community.id,
    community.id,
  );
}