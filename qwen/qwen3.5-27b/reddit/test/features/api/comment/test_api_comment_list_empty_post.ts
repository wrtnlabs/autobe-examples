import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test retrieving comments for a post that has no comments.
 *
 * Validates the edge case where a post exists but has zero comments. The test ensures that the comment list endpoint returns a properly structured paginated response with an empty data array and correct pagination metadata (zero records, zero pages) when querying a post without any comments.
 *
 * 1. Authenticate a member account via join endpoint.
 * 2. Subscribe the member to a community to enable post creation.
 * 3. Create a text post in the subscribed community without adding any comments.
 * 4. Retrieve the comment list for the post using the comments index endpoint.
 * 5. Validate that the response contains an empty data array.
 * 6. Validate that pagination metadata shows zero records and zero pages.
 */
export async function test_api_comment_list_empty_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Subscribe to community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {},
    );
  typia.assert(subscription);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: subscription.community.id,
      },
    },
  );
  typia.assert(post);
  // 4. Retrieve comments for the post (should be empty)
  const commentsPage = await api.functional.redditClone.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {} satisfies IRedditCloneComment.IRequest,
    },
  );
  typia.assert(commentsPage);
  // 5. Validate empty data array
  TestValidator.equals("empty comments array", commentsPage.data.length, 0);
  // 6. Validate pagination metadata
  TestValidator.equals("zero records", commentsPage.pagination.records, 0);
  TestValidator.equals("zero pages", commentsPage.pagination.pages, 0);
  TestValidator.equals("current page is 1", commentsPage.pagination.current, 1);
}
