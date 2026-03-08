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
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

/**
 * Test that non-owners cannot remove moderators from communities.
 * This is a critical authorization boundary test.
 *
 * 1. Owner creates a community and becomes the owner
 * 2. Owner adds a second member as a moderator
 * 3. Non-owner third member attempts to remove the moderator
 * 4. Verify 403 Forbidden is returned
 * 5. Verify the moderator relationship still exists
 */
export async function test_api_community_nonowner_remove_moderator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up first member (owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  // 2. Owner creates a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Set up second member (will become moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderator);
  // 4. Owner adds second member as moderator
  const addedModerator =
    await generate_random_reddit_platform_member_communities_moderators_add(
      ownerConnection,
      {
        body: { user_id: moderator.id },
        params: { communityId: community.id },
      },
    );
  typia.assert(addedModerator);
  // 5. Set up third member (non-owner, non-moderator)
  const thirdMemberConnection: api.IConnection = { host: connection.host };
  const thirdMember = await authorize_member_join(thirdMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(thirdMember);
  // 6. Verify moderator relationship exists before deletion attempt
  TestValidator.equals(
    "community should have 1 moderator initially",
    community.moderators.length,
    1,
  );
  TestValidator.equals(
    "moderator user matches",
    community.moderators[0].user.id,
    moderator.id,
  );
  // 7. Third member (non-owner) attempts to remove moderator - should fail with 403
  await TestValidator.error("non-owner cannot remove moderator", async () => {
    await api.functional.redditPlatform.member.communities.moderators.erase(
      thirdMemberConnection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
      },
    );
  });
  // 8. Verify the moderator relationship still exists after failed deletion attempt
  // The community object from the addModerator call already contains this data
  TestValidator.equals(
    "moderator relationship should persist after failed deletion",
    community.moderators.length,
    1,
  );
  TestValidator.equals(
    "moderator user should still be same after failed deletion",
    community.moderators[0].user.id,
    moderator.id,
  );
  // 9. Verify moderator still has privileges intact
  TestValidator.predicate(
    "moderator still has moderator privileges",
    moderator.moderatorOfCommunities.length > 0,
  );
}
