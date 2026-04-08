import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

/**
 * Test duplicate moderator assignment prevention for the same member-community pair.
 *
 * Validates the business rule that prevents assigning the same member as a moderator to a community multiple times. This test ensures the unique constraint on the member-community pair is enforced at the API level.
 *
 * The test creates an owner account, establishes a community, creates a target member account, and then attempts to add the target member as a moderator twice. The first assignment should succeed while the second should be rejected with an appropriate error.
 *
 * 1. Owner member account is created and authenticated.
 * 2. Community is created by the owner.
 * 3. Target member account is created and authenticated.
 * 4. Owner adds target member as moderator (first time - succeeds).
 * 5. Owner attempts to add same target member as moderator again (fails with business error).
 */
export async function test_api_moderator_assignment_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community as owner
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(community);
  // 3. Create target member account (to be added as moderator)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(targetAuth);
  // 4. First moderator assignment - should succeed
  const firstAssignment =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          memberId: targetAuth.id,
          role: "moderator",
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(firstAssignment);
  // Verify the assignment details
  TestValidator.equals(
    "memberId matches",
    firstAssignment.member.id,
    targetAuth.id,
  );
  TestValidator.equals("role is moderator", firstAssignment.role, "moderator");
  // 5. Second moderator assignment - should fail (duplicate prevention)
  await TestValidator.error(
    "duplicate moderator assignment rejected",
    async () => {
      await generate_random_reddit_community_member_communities_moderators_create(
        ownerConnection,
        {
          body: {
            memberId: targetAuth.id,
            role: "moderator",
          } satisfies IRedditCommunityModerator.ICreate,
          params: {
            communityId: community.id,
          },
        },
      );
    },
  );
}
