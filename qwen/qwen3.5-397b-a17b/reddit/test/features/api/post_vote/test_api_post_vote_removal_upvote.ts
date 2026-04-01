import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_vote_create } from "../../../generate/generate_random_reddit_community_member_posts_vote_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";

/**
 * Test the successful removal of an upvote from a post.
 *
 * This test validates the complete vote removal workflow:
 * 1. Post author creates a community and text post
 * 2. Voter subscribes to community and casts an upvote
 * 3. Vote removal succeeds without error
 * 4. Subsequent removal attempt returns 404
 */
export async function test_api_post_vote_removal_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create post author member account
  const postAuthorConnection: api.IConnection = { host: connection.host };
  const postAuthorAuth = await authorize_member_join(postAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(postAuthorAuth);
  // 2. Create community as post author
  const community =
    await generate_random_reddit_community_member_communities_create(
      postAuthorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create voter member account
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(voterAuth);
  // 4. Subscribe voter to community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      voterConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 5. Create text post as post author
  const post = await api.functional.redditCommunity.member.posts.create(
    postAuthorConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Cast upvote as voter
  const upvote = await api.functional.redditCommunity.member.posts.vote.create(
    voterConnection,
    {
      postId: post.id,
      body: {
        direction: "UPVOTE",
      } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  typia.assert(upvote);
  TestValidator.equals("vote direction", upvote.direction, "UPVOTE");
  // 7. Remove the upvote - should succeed without error
  await api.functional.redditCommunity.member.posts.vote.erase(
    voterConnection,
    {
      postId: post.id,
    },
  );
  // 8. Verify attempting to remove vote again returns 404 (no active vote exists)
  await TestValidator.httpError(
    "second vote removal should return 404",
    404,
    async () => {
      await api.functional.redditCommunity.member.posts.vote.erase(
        voterConnection,
        {
          postId: post.id,
        },
      );
    },
  );
}
