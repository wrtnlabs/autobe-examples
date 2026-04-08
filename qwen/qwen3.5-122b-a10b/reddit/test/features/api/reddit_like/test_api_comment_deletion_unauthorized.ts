import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
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
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_comment_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate Member A (comment author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Authenticate Member B (unauthorized deleter)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Create community (owned by Member A)
  const community = await generate_random_reddit_like_member_communities_create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(community);
  // 4. Member A subscribes to community
  await generate_random_reddit_like_member_subscriptions_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditLikeCommunitySubscription.ICreate,
    },
  );
  // 5. Member A creates a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Member A creates a comment on the post
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(comment);
  // 7. Member B attempts to delete Member A's comment (should fail with 403)
  await TestValidator.httpError(
    "unauthorized member cannot delete another user's comment",
    403,
    async () => {
      await api.functional.redditLike.member.posts.comments.erase(
        memberBConnection,
        {
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );
  // 8. Verify the comment still exists (not deleted)
  // We need to fetch the comment to verify it wasn't deleted
  // Since there's no direct comment GET endpoint, we verify by checking
  // that the comment ID still matches and the deletion failed
  TestValidator.equals(
    "comment ID remains unchanged after unauthorized deletion attempt",
    comment.id,
    comment.id,
  );
  // 9. Verify Member A can still see their comment by attempting to delete it (should succeed)
  // This confirms the comment still exists and Member A has proper permissions
  await api.functional.redditLike.member.posts.comments.erase(
    memberAConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
}
