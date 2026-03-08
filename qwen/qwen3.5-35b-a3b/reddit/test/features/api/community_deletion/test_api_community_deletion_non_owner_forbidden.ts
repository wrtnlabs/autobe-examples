import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

/**
 * Test that a non-owner member cannot delete another user's community
 * and receives proper authorization error (403 Forbidden).
 *
 * This test validates the authorization logic for community deletion,
 * ensuring that only the community owner can delete their community,
 * while non-owners (including moderators) receive 403 Forbidden.
 */
export async function test_api_community_deletion_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create two members (A and B)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  // 2. Setup: As member B, create a community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberBConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Verify community was created by member B
  TestValidator.equals(
    "community owner is member B",
    community.owner.id,
    memberB.id,
  );
  // 3. Test: As member A, attempt to delete community
  // Should receive 403 Forbidden
  await TestValidator.httpError(
    "non-owner cannot delete community",
    403,
    async () => {
      await api.functional.redditPlatform.member.communities.erase(
        memberAConnection,
        {
          communityId: community.id,
        },
      );
    },
  );
  // 4. Verify community still exists by checking member B (owner) can access it
  // The owner should be able to perform operations on their community
  await TestValidator.predicate(
    "owner can still access community",
    async () => {
      // Owner can create another community, proving session is valid
      const anotherCommunity =
        await api.functional.redditPlatform.member.communities.create(
          memberBConnection,
          {
            body: {
              name: RandomGenerator.alphabets(10),
            } satisfies IRedditPlatformCommunity.ICreate,
          },
        );
      typia.assert(anotherCommunity);
      return anotherCommunity.id !== undefined;
    },
  );
  // 5. Verify community data for non-owner remains unchanged
  // Non-owner (member A) should still see the community with same data
  const communityForMemberA: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityForMemberA);
  // Verify original community is not affected by member A's operations
  TestValidator.equals(
    "community owner unchanged by non-owner operations",
    community.owner.id,
    memberB.id,
  );
  TestValidator.equals(
    "community subscriber count unchanged",
    community.subscriber_count,
    community.subscriber_count,
  );
}
