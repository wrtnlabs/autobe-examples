import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
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
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_home_feed_with_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
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
          communityId: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the subscribed community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Retrieve the home feed
  const homeFeed =
    await api.functional.redditClone.member.feed.home(memberConnection);
  typia.assert(homeFeed);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    homeFeed.pagination !== null && homeFeed.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is valid",
    homeFeed.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", homeFeed.pagination.limit >= 0);
  TestValidator.predicate(
    "records count is valid",
    homeFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    homeFeed.pagination.pages >= 0,
  );
  // 7. Validate feed contains the created post
  TestValidator.predicate("feed has posts", homeFeed.data.length > 0);
  // Find our created post in the feed
  const createdPostInFeed = homeFeed.data.find((p) => p.id === post.id);
  TestValidator.predicate(
    "created post is in feed",
    createdPostInFeed !== undefined,
  );
  // 8. Validate post summary structure
  if (createdPostInFeed) {
    TestValidator.equals(
      "post title matches",
      createdPostInFeed.title,
      post.title,
    );
    TestValidator.equals("post type is text", createdPostInFeed.type, "text");
    TestValidator.equals("vote score is zero", createdPostInFeed.voteScore, 0);
    TestValidator.equals(
      "comment count is zero",
      createdPostInFeed.commentCount,
      0,
    );
    TestValidator.predicate(
      "createdAt exists",
      createdPostInFeed.createdAt !== null &&
        createdPostInFeed.createdAt !== undefined,
    );
    // Validate author information
    TestValidator.equals(
      "author id matches",
      createdPostInFeed.author.id,
      member.id,
    );
    TestValidator.equals(
      "author username matches",
      createdPostInFeed.author.username,
      member.username,
    );
    // Validate community information
    TestValidator.equals(
      "community id matches",
      createdPostInFeed.community.id,
      community.id,
    );
    TestValidator.equals(
      "community name matches",
      createdPostInFeed.community.name,
      community.name,
    );
  }
}
