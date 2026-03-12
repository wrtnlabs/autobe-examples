import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test that only community owners can add moderators, and non-owner members are rejected.
 * 1. Owner creates a community and authenticates
 * 2. A different member (non-owner) authenticates separately
 * 3. Non-owner member attempts to add another member as moderator to the owner's community
 * 4. System returns 403 Forbidden error indicating insufficient permissions
 */
export async function test_api_community_moderator_non_owner_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(owner);
  // 2. Create community with owner connection
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Authenticate as non-owner member (attempting unauthorized moderator addition)
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwner = await authorize_member_join(nonOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(nonOwner);
  // 4. Authenticate as target member (who will be attempted as moderator addition target)
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(targetMember);
  // 5. Non-owner member attempts to add target member as moderator
  // This should fail with 403 Forbidden because only the owner can add moderators
  await TestValidator.error("non-owner cannot add moderators", async () => {
    await api.functional.redditClone.member.communities.moderators.create(
      nonOwnerConnection,
      {
        communityId: community.id,
        body: {
          memberId: targetMember.id,
          role: "mod",
        } satisfies IRedditCloneCommunityModerator.ICreate,
      },
    );
  });
}
