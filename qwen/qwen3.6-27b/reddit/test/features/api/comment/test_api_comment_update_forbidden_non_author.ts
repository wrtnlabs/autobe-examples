import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that non-author members are forbidden from updating another member's comment.
 *
 * Validates the ownership enforcement mechanism on comment updates. When Member A
 * creates a comment, Member B (a different, unrelated actor) must be rejected with
 * HTTP 403 Forbidden if they attempt to modify that comment's body. The system
 * ensures only the original author retains edit privileges.
 *
 * This test verifies critical access control logic:
 *
 * 1. Member A authenticates and creates the full content hierarchy (community, subscription, post, comment).
 * 2. Member B authenticates as a completely separate account with no relation to the comment.
 * 3. Member B attempts to update Member A's comment body.
 * 4. HTTP 403 Forbidden is returned, enforcing author-only edit permissions.
 */
export async function test_api_comment_update_forbidden_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Member A (comment author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {},
  });
  typia.assert(memberAAuthorized);
  // 2. Create a community as Member A
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberAConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe to the community as Member A
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberAConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Create a post in the community as Member A
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberAConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 5. Create a comment on the post as Member A
  const originalCommentBody = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: { body: originalCommentBody },
      },
    );
  typia.assert(comment);
  // 6. Authenticate as Member B (different user, non-author)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {},
  });
  typia.assert(memberBAuthorized);
  // 7. Member B attempts to update Member A's comment → should fail with 403 Forbidden
  const updateBody: IRedditLikeCommunityPostComment.IUpdate = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
  };
  await TestValidator.httpError(
    "non-author forbidden from updating comment",
    403,
    async () =>
      await api.functional.redditLikeCommunity.member.posts.comments.update(
        memberBConnection,
        {
          postId: post.id,
          commentId: comment.id,
          body: updateBody,
        },
      ),
  );
}
