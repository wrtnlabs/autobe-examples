import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test that a moderator cannot delete comments from communities they don't moderate.
 *
 * A moderator attempts to delete a comment from a community where they do not hold
 * moderation privileges. The response should return 403 Forbidden, confirming the
 * authorization boundary is enforced preventing cross-community moderation.
 */
export async function test_api_comment_moderator_deletes_unauthorized_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: First member joins as regular member
  const memberConnection: api.IConnection = { host: connection.host };
  const firstMember: IRedditLikeMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditLikeMember.IJoin,
    });
  typia.assert(firstMember);
  // 2. First member creates their community
  const community1: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // 3. First member subscribes to their own community
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community1.id,
      },
    );
  typia.assert(subscription);
  // 4. First member creates a post
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: community1.id,
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);
  // 5. First member creates a comment
  const comment: IRedditLikeComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Setup: Second member joins as moderator (creates their own account)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const secondMember: IRedditLikeModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IRedditLikeModerator.IJoin,
    });
  typia.assert(secondMember);
  // 7. Second member creates their own community (becoming its moderator of a different community)
  const community2: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // Note: secondMember is now moderator of community2, NOT community1 where the comment exists
  // 8. Attempt to delete the comment from first member's community as second member (unauthorized moderator)
  // This should fail with 403 Forbidden because secondMember is moderator of community2, not community1
  await TestValidator.httpError(
    "cross-community moderation returns 403 Forbidden",
    403,
    async () => {
      await api.functional.redditLike.moderator.posts.comments.erase(
        moderatorConnection,
        {
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );
}
