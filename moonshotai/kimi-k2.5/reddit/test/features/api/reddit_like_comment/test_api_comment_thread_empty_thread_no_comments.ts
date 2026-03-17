import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
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
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test that an owner receives an empty thread array for a post with no comments.
 * This validates the edge case where a newly created post has no discussion yet.
 * The test sequence is: 1) Authenticate as owner using join, 2) Authenticate as member using join for data setup,
 * 3) Create community as member, 4) Subscribe to community, 5) Create a fresh text-type post,
 * 6) Retrieve thread as owner without creating any comments, 7) Verify response contains empty replies array
 * indicating no discussion exists yet. This confirms the endpoint handles empty threads gracefully without errors.
 */
export async function test_api_comment_thread_empty_thread_no_comments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as owner using join
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: IRedditLikeOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    {},
  );
  typia.assert(owner);
  // 2. Authenticate as member using join for data setup
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(member);
  // 3. Create community as member
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // 4. Subscribe to community
  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 5. Create a fresh text-type post
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(memberConnection, {
      body: {
        community_id: community.id,
        title: "Test post for empty thread",
        body: "This is a test post body content",
      },
    });
  typia.assert(post);
  // 6. Retrieve thread as owner without creating any comments
  const thread: IRedditLikeComment.IThread =
    await api.functional.redditLike.owner.posts.comments.thread(
      ownerConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(thread);
  // 7. Verify response contains empty array indicating no discussion exists yet
  TestValidator.equals("thread should be empty for new post", thread.replies.length, 0);
}