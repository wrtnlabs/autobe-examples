import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Test updating title and URL of a link-type post authored by an authenticated member.
 *
 * Validates the complete update flow including member authentication, community creation, community subscription, initial link post creation, and subsequent title and URL update. Confirms that the updated post reflects new values while preserving link-type invariants.
 *
 * Special attention is given to verifying that the post_type remains 'link', body remains null after update, the updated_at timestamp changes on modification, and the created_at timestamp along with author identity are preserved.
 *
 * 1. Member registers and authenticates on the platform.
 * 2. Member creates a community and subscribes to it for posting privileges.
 * 3. Member creates a link-type post with an initial title and external URL.
 * 4. Member updates the post with a new title and a new URL.
 * 5. Validates that the updated post has the new title, new URL, unchanged post_type ('link'), null body, refreshed updated_at, and unchanged created_at.
 */
export async function test_api_post_update_link_url(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials: IREdditLikeCommunityMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  await authorize_member_join(memberConnection, { body: memberCredentials });
  // 2. Create community
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe to community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  // 4. Create link-type post with initial URL
  const initialUrl = typia.random<string & tags.Format<"uri">>();
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
  const post: IREdditLikeCommunityPost =
    await generate_random_reddit_like_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: initialTitle,
          post_type: "link",
          community_id: community.id,
          url: typia.assert<(string & tags.Format<"uri">) | null | undefined>(initialUrl),
        },
      },
    );
  typia.assert(post);
  TestValidator.equals("initial post type is link", post.post_type, "link");
  TestValidator.equals("initial URL matches", post.url, initialUrl);
  TestValidator.equals("initial body is null", post.body, null);
  TestValidator.equals("initial title matches", post.title, initialTitle);
  const createdAtBefore = post.created_at;
  const authorIdBefore = post.author.id;
  // 5. Update post title and URL
  const newTitle = RandomGenerator.paragraph({ sentences: 4 });
  const newUrl = typia.random<string & tags.Format<"uri">>();
  const updateBody = {
    title: newTitle,
    url: typia.assert<(string & tags.MaxLength<80000>) | null | undefined>(newUrl),
  } satisfies IREdditLikeCommunityPost.IUpdate;
  const updatedPost: IREdditLikeCommunityPost =
    await api.functional.redditLikeCommunity.member.posts.update(
      memberConnection,
      {
        postId: post.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPost);
  // 6. Validate update results
  TestValidator.equals("title was updated", updatedPost.title, newTitle);
  TestValidator.equals("url was updated", updatedPost.url, newUrl);
  TestValidator.equals("post_type remains link", updatedPost.post_type, "link");
  TestValidator.equals("body remains null", updatedPost.body, null);
  TestValidator.equals(
    "created_at unchanged",
    updatedPost.created_at,
    createdAtBefore,
  );
  TestValidator.equals(
    "author unchanged",
    updatedPost.author.id,
    authorIdBefore,
  );
  TestValidator.predicate(
    "updated_at was refreshed",
    () => updatedPost.updated_at !== post.updated_at,
  );
}