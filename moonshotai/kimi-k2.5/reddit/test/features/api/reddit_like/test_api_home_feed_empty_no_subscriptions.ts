import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_home_feed_empty_no_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community - member is owner but not explicitly subscribed for feed purposes
  // The home feed requires active subscriptions, which are separate from ownership
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Call home feed endpoint - member has no subscriptions, so feed should be empty
  // Per API spec: posts require subscription to create, so no posts can exist without subscriptions
  const homeFeed: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.member.feeds.home.index(memberConnection, {
      body: {} satisfies IRedditLikePost.IRequest,
    });
  typia.assert(homeFeed);
  // 4. Validate feed is empty per FR-SUB-025 (subscription-based filtering)
  TestValidator.equals("data array is empty", homeFeed.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    homeFeed.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", homeFeed.pagination.pages, 0);
  TestValidator.equals("current page is 1", homeFeed.pagination.current, 1);
  TestValidator.equals(
    "limit has default value",
    homeFeed.pagination.limit,
    20,
  );
  // 5. Verify no posts from the created community appear in feed
  const postsFromCreatedCommunity = homeFeed.data.filter(
    (post) => post.community.id === community.id,
  );
  TestValidator.equals(
    "no posts from created community in feed",
    postsFromCreatedCommunity.length,
    0,
  );
}
