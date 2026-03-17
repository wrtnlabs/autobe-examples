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

export async function test_api_post_update_link_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
  typia.assert(memberAuth);
  // 2. Create a community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe member to the community (already subscribed as creator, but explicit for clarity)
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a LINK type post with initial title and URL
  const originalUrl = typia.random<string & tags.Format<"uri">>();
  const originalTitle = RandomGenerator.paragraph({ sentences: 1 });
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        post_type: "LINK" as const,
        community_id: community.id,
        link: {
          url: originalUrl,
        } satisfies IRedditClonePostLink.ICreate,
      },
    },
  );
  typia.assert(post);
  TestValidator.equals("post type is LINK", post.post_type, "LINK");
  TestValidator.equals("original title matches", post.title, originalTitle);
  TestValidator.equals("original URL matches", post.url, originalUrl);
  // 5. Update the post with new title and different URL
  const updatedTitle = RandomGenerator.paragraph({ sentences: 1 });
  const updatedUrl = typia.random<string & tags.Format<"uri">>();
  const updatedPost = await api.functional.redditClone.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: updatedTitle,
        url: updatedUrl,
      } satisfies IRedditClonePost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Validate the update results
  TestValidator.equals("post type remains LINK", updatedPost.post_type, "LINK");
  TestValidator.equals("title is updated", updatedPost.title, updatedTitle);
  TestValidator.equals("URL is updated", updatedPost.url, updatedUrl);
  TestValidator.notEquals("title changed", originalTitle, updatedPost.title);
  TestValidator.notEquals("URL changed", originalUrl, updatedPost.url);
  TestValidator.notEquals(
    "updated_at changed",
    post.updated_at,
    updatedPost.updated_at,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedPost.updated_at).getTime() >=
      new Date(updatedPost.created_at).getTime(),
  );
}