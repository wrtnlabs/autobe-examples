import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityComment";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
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
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";

/**
 * Test the primary success path for retrieving comments with default 'new' sorting.
 *
 * Validates the complete comment retrieval flow including member authentication, community creation, subscription, post creation, and sequential comment creation. Ensures that the comment index endpoint correctly defaults to 'new' sorting (created_at DESC) when no sort parameter is provided. Verifies pagination metadata structure and that paginated results are correctly limited and ordered.
 *
 * 1. Member joins the platform with unique credentials.
 * 2. Member creates a community and subscribes to it.
 * 3. Member creates a post within the subscribed community.
 * 4. Member creates three sequential top-level comments on the post.
 * 5. Retrieves comments without sort parameter, verifying default 'new' sort (created_at DESC).
 * 6. Validates pagination structure and verifies explicit page/limit parameters restrict results.
 */
export async function test_api_post_comment_default_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: "https://test.com/join",
      referrer: "https://test.com/home",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Community creation
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Community subscription
  const subscription: IRedditLikeCommunityCommunitySubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Post creation
  const post: IREdditLikeCommunityPost =
    await generate_random_reddit_like_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          post_type: "text",
          community_id: community.id,
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IREdditLikeCommunityPost.ICreate,
      },
    );
  typia.assert(post);
  // 5. Create three sequential comments
  const comments: IRedditLikeCommunityPostComment[] =
    await ArrayUtil.asyncRepeat(3, async (i) => {
      const comment =
        await generate_random_reddit_like_community_member_posts_comments_create(
          memberConnection,
          {
            body: { body: RandomGenerator.paragraph({ sentences: 2 }) },
            params: { postId: post.id },
          },
        );
      typia.assert(comment);
      return comment;
    });
  // 6. Retrieve comments with default sorting
  const response =
    await api.functional.redditLikeCommunity.member.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {} satisfies IREdditLikeCommunityComment.IRequest,
      },
    );
  typia.assert(response);
  // 7. Verify default 'new' sort (created_at DESC)
  // comments[2] is newest, comments[1] is middle, comments[0] is oldest
  TestValidator.equals(
    "newest comment first",
    response.data[0].id,
    comments[2].id,
  );
  TestValidator.equals(
    "middle comment second",
    response.data[1].id,
    comments[1].id,
  );
  TestValidator.equals(
    "oldest comment third",
    response.data[2].id,
    comments[0].id,
  );
  // 8. Verify pagination with explicit page and limit parameters
  const paginatedResponse =
    await api.functional.redditLikeCommunity.member.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IREdditLikeCommunityComment.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination current page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedResponse.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination data limited to 2",
    paginatedResponse.data.length <= 2,
  );
}
