import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

export async function test_api_home_feed_with_subscribed_community_posts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
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
  // 4. Create a text post in the community
  const textPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text",
      },
    },
  );
  typia.assert(textPost);
  // 5. Create a link post in the community
  const linkPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "link",
      },
    },
  );
  typia.assert(linkPost);
  // 6. Create an image post in the community
  const imagePost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "image",
      },
    },
  );
  typia.assert(imagePost);
  // 7. Retrieve the home feed with default 'hot' sorting
  const homeFeed = await api.functional.redditClone.member.posts.home.index(
    memberConnection,
    {
      body: {
        sort: "hot",
      },
    },
  );
  typia.assert(homeFeed);
  // 8. Validate the response
  // Response returns paginated list of posts
  TestValidator.equals("pagination exists", homeFeed.pagination !== null, true);
  TestValidator.equals("data array exists", Array.isArray(homeFeed.data), true);
  TestValidator.predicate("has posts", homeFeed.data.length > 0);
  // Find our created posts in the feed
  const textPostInFeed = homeFeed.data.find((p) => p.id === textPost.id);
  const linkPostInFeed = homeFeed.data.find((p) => p.id === linkPost.id);
  const imagePostInFeed = homeFeed.data.find((p) => p.id === imagePost.id);
  // Validate text post is in feed
  TestValidator.predicate("text post in feed", textPostInFeed !== undefined);
  TestValidator.equals("text post type", textPostInFeed!.type, "text");
  TestValidator.equals(
    "text post title matches",
    textPostInFeed!.title,
    textPost.title,
  );
  TestValidator.equals(
    "text post community matches",
    textPostInFeed!.community.name,
    community.name,
  );
  TestValidator.predicate(
    "text post has vote_score",
    typeof textPostInFeed!.vote_score === "number",
  );
  TestValidator.predicate(
    "text post has comment_count",
    typeof textPostInFeed!.comment_count === "number",
  );
  TestValidator.predicate(
    "text post has created_at",
    textPostInFeed!.created_at !== undefined,
  );
  // Validate link post is in feed
  TestValidator.predicate("link post in feed", linkPostInFeed !== undefined);
  TestValidator.equals("link post type", linkPostInFeed!.type, "link");
  TestValidator.equals(
    "link post title matches",
    linkPostInFeed!.title,
    linkPost.title,
  );
  TestValidator.equals(
    "link post community matches",
    linkPostInFeed!.community.name,
    community.name,
  );
  // Validate image post is in feed
  TestValidator.predicate("image post in feed", imagePostInFeed !== undefined);
  TestValidator.equals("image post type", imagePostInFeed!.type, "image");
  TestValidator.equals(
    "image post title matches",
    imagePostInFeed!.title,
    imagePost.title,
  );
  TestValidator.equals(
    "image post community matches",
    imagePostInFeed!.community.name,
    community.name,
  );
  // Validate community details in posts
  TestValidator.predicate(
    "community has name",
    textPostInFeed!.community.name.length > 0,
  );
  TestValidator.predicate(
    "community has subscriber_count",
    typeof textPostInFeed!.community.subscriber_count === "number",
  );
  TestValidator.predicate(
    "community has created_at",
    textPostInFeed!.community.created_at !== undefined,
  );
  // Validate author details in posts
  TestValidator.predicate(
    "author has username",
    textPostInFeed!.author.username.length > 0,
  );
  TestValidator.predicate(
    "author has karma_count",
    typeof textPostInFeed!.author.karma_count === "number",
  );
  // Validate post IDs are unique
  const postIds = homeFeed.data.map((p) => p.id);
  const uniqueIds = new Set(postIds);
  TestValidator.equals(
    "all post IDs are unique",
    uniqueIds.size === postIds.length,
    true,
  );
}
