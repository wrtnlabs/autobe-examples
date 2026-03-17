import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
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
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test the business error when a comment exists but doesn't belong to the specified post (comment-post mismatch).
 * This validates the constraint that the comment must belong to the post specified in the URL path.
 */
export async function test_api_comment_update_comment_post_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create first community
  const community1 =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community1);
  // 3. Subscribe to first community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community1.id,
    },
  );
  // 4. Create a post in first community
  const post1 = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: { community_id: community1.id },
    },
  );
  typia.assert(post1);
  // 5. Create a comment on the first post
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post1.id },
      },
    );
  typia.assert(comment);
  // 6. Create second community
  const community2 =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community2);
  // 7. Subscribe to second community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community2.id,
    },
  );
  // 8. Create a post in second community
  const post2 = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: { community_id: community2.id },
    },
  );
  typia.assert(post2);
  // 9. Attempt to update the comment using the second post's ID (should fail)
  await TestValidator.error(
    "comment-post mismatch update should fail",
    async () => {
      await api.functional.redditLike.member.posts.comments.update(
        memberConnection,
        {
          postId: post2.id,
          commentId: comment.id,
          body: {
            content: "This update should fail due to post mismatch",
          } satisfies IRedditLikeComment.IUpdate,
        },
      );
    },
  );
}
