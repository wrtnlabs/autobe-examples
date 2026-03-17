import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authorized connection
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create member-specific connection with authorization token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 2. Create community (creator is automatically subscribed)
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 3. Create TEXT type post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create comment on the post
  const originalCommentBody = RandomGenerator.paragraph({ sentences: 3 });
  const originalComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          body: originalCommentBody,
          parent_comment_id: null,
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(originalComment);
  // Store original timestamps for validation
  const originalCreatedAt = originalComment.created_at;
  const originalUpdatedAt = originalComment.updated_at;
  // Wait a small amount to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 5. Update the comment with new body content
  const updatedBody = RandomGenerator.paragraph({ sentences: 4 });
  const updatedComment =
    await api.functional.redditClone.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: originalComment.id,
        body: {
          body: updatedBody,
        } satisfies IRedditCloneComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 6. Validate the update results
  // Verify the body was updated
  TestValidator.equals(
    "comment body updated",
    updatedComment.body,
    updatedBody,
  );
  // Verify the body is different from original
  TestValidator.notEquals(
    "body changed from original",
    updatedComment.body,
    originalCommentBody,
  );
  // Verify created_at remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedComment.created_at,
    originalCreatedAt,
  );
  // Verify updated_at has changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedComment.updated_at,
    originalUpdatedAt,
  );
  // Verify comment ID remains the same
  TestValidator.equals(
    "comment id unchanged",
    updatedComment.id,
    originalComment.id,
  );
  // Verify author remains the same
  TestValidator.equals(
    "author unchanged",
    updatedComment.author.id,
    originalComment.author.id,
  );
  // Verify post reference remains the same
  TestValidator.equals(
    "post reference unchanged",
    updatedComment.post.id,
    originalComment.post.id,
  );
  // Verify parent remains the same (null for top-level comment)
  TestValidator.equals(
    "parent unchanged",
    updatedComment.parent,
    originalComment.parent,
  );
  // Verify vote score remains the same
  TestValidator.equals(
    "vote score unchanged",
    updatedComment.vote_score,
    originalComment.vote_score,
  );
}
