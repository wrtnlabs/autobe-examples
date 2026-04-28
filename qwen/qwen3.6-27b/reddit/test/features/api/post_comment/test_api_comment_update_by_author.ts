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
 * Test that the comment author can successfully update their own comment's body text.
 *
 * Validates the complete comment update workflow from member authentication through
 * comment creation and modification. Ensures that the updated comment body reflects
 * the new text, the original creation timestamp is preserved, the update timestamp
 * is refreshed, author and post associations remain intact, the comment is not
 * soft-deleted, and vote score and child comments are returned correctly.
 *
 * 1. Member registers and authenticates on the platform.
 * 2. Member creates a community and subscribes to it.
 * 3. Member creates a post in the subscribed community.
 * 4. Member creates a comment on the post with initial body content.
 * 5. Member updates the comment with new body content.
 * 6. Validates that body field reflects the new text.
 * 7. Validates that createdAt timestamp is preserved.
 * 8. Validates that updatedAt timestamp differs from createdAt.
 * 9. Validates that author attribution remains unchanged.
 * 10. Validates that comment post association is intact.
 * 11. Validates that deletedAt is null.
 */
export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Community creation
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Community subscription
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Post creation
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 5. Comment creation
  const originalBody = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { body: originalBody },
      },
    );
  typia.assert(comment);
  // Store original values for validation
  const originalCreatedAt = comment.createdAt;
  const originalAuthorId = comment.author.id;
  const originalPostId = comment.post.id;
  // 6. Comment update
  const updatedBody = RandomGenerator.paragraph({ sentences: 5 });
  const updatedComment =
    await api.functional.redditLikeCommunity.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: updatedBody,
        } satisfies IRedditLikeCommunityPostComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 7. Validate body was updated
  TestValidator.equals(
    "body reflects new content",
    updatedComment.body,
    updatedBody,
  );
  // 8. Validate createdAt is preserved
  TestValidator.equals(
    "createdAt timestamp preserved",
    updatedComment.createdAt,
    originalCreatedAt,
  );
  // 9. Validate updatedAt differs from createdAt
  TestValidator.notEquals(
    "updatedAt refreshed",
    updatedComment.updatedAt,
    originalCreatedAt,
  );
  // 10. Validate author attribution unchanged
  TestValidator.equals(
    "author id unchanged",
    updatedComment.author.id,
    originalAuthorId,
  );
  // 11. Validate post association intact
  TestValidator.equals(
    "post id unchanged",
    updatedComment.post.id,
    originalPostId,
  );
  // 12. Validate deletedAt is null
  TestValidator.equals("comment not deleted", updatedComment.deletedAt, null);
  // 13. Validate voteScore and childComments exist
  TestValidator.predicate(
    "voteScore is integer",
    typeof updatedComment.voteScore === "number",
  );
  TestValidator.predicate(
    "childComments is array",
    Array.isArray(updatedComment.childComments),
  );
}
