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
 * Validates behavior when attempting to delete an already soft-deleted comment.
 *
 * Validates the complete soft-delete idempotency workflow for post comments. Authenticates a new member, creates a community, subscribes the member to gain posting privileges, creates a post, and then creates a comment on that post. The comment is successfully deleted first time, which sets the deleted_at timestamp in the database.
 *
 * The same member then immediately attempts to delete the same comment a second time. The system detects that the comment has an existing deleted_at value (not null) and should return an HTTP 410 Gone status. This confirms the idempotent safety mechanism for soft-deleted content, preventing redundant database updates.
 *
 * 1. Member authenticates via join endpoint.
 * 2. Community is created by the authenticated member.
 * 3. Member subscribes to the created community to gain posting privileges.
 * 4. Member creates a text post in the subscribed community.
 * 5. Member creates a comment on the created post.
 * 6. Member deletes the comment for the first time, which succeeds and soft-deletes it.
 * 7. Member attempts to delete the same comment a second time using the same identifiers.
 * 8. Validates that the second deletion attempt throws an HTTP 410 error.
 */
export async function test_api_comment_delete_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<IREdditLikeCommunityCommunity.ICreate>,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 4. Create post in community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create comment on post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(comment);
  // 6. Delete comment (first time - success)
  await api.functional.redditLikeCommunity.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // 7. Attempt to delete comment again (second time - should fail with 410)
  await TestValidator.httpError("comment already deleted", 410, async () => {
    await api.functional.redditLikeCommunity.member.posts.comments.erase(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  });
}
