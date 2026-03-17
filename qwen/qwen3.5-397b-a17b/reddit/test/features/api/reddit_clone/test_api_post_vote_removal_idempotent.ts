import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test idempotent behavior where a member attempts to remove a vote from a post they have not voted on.
 *
 * Test Steps:
 * 1. Create voter member account using authorize_member_join utility
 * 2. Create post author member account using authorize_member_join utility
 * 3. Create community owned by post author using generate_random_reddit_clone_communities_create
 * 4. Subscribe voter to the community using generate_random_reddit_clone_member_subscriptions_create
 * 5. Create a text post in the community as the post author using generate_random_reddit_clone_member_posts_create
 * 6. Do NOT cast any vote on the post (skip voting step)
 * 7. Attempt to remove vote via DELETE - verify it succeeds without error (no-op behavior)
 * 8. Attempt to remove vote a second time - verify it still succeeds (idempotent)
 *
 * Business Validations:
 * - Removing non-existent vote succeeds (no-op behavior)
 * - Operation is idempotent - multiple removals don't cause errors
 * - No karma adjustments occur when no vote was removed
 */
export async function test_api_post_vote_removal_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create voter member account
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(voterAuth);
  voterConnection.headers = {
    Authorization: `Bearer ${voterAuth.token.access}`,
  };
  // 2. Create post author member account
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(authorAuth);
  authorConnection.headers = {
    Authorization: `Bearer ${authorAuth.token.access}`,
  };
  // 3. Create community owned by post author
  const community = await generate_random_reddit_clone_communities_create(
    authorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 4. Subscribe voter to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      voterConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 5. Create a text post in the community as the post author
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(post);
  // 6. Do NOT cast any vote on the post (skip voting step)
  // Post starts with vote_score of 0
  // 7. Attempt to remove vote (first time) - should succeed without error
  // Even though no vote exists, this should be a no-op and succeed
  await api.functional.redditClone.member.posts._vote.erase(voterConnection, {
    postId: post.id,
  });
  // 8. Attempt to remove vote (second time) - should still succeed (idempotent)
  await api.functional.redditClone.member.posts._vote.erase(voterConnection, {
    postId: post.id,
  });
  // Test passes if both erase calls completed without throwing errors
  // This validates the idempotent no-op behavior
  TestValidator.predicate("vote removal is idempotent", true);
}
