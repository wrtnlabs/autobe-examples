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

/**
 * Test unauthorized comment deletion - verifies that a user who is neither
 * the comment author nor a community moderator cannot delete a comment.
 *
 * Flow:
 * 1. Create community owner account and community
 * 2. Create comment author account
 * 3. Create unauthorized user account (will attempt deletion)
 * 4. All three members subscribe to the community
 * 5. Community owner creates a post
 * 6. Comment author creates a comment on the post
 * 7. Unauthorized user attempts to delete the comment (should fail with 403)
 * 8. Validate the operation was rejected and access control is enforced
 */
export async function test_api_comment_deletion_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner and community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 2. Create comment author account
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(authorAuth);
  // 3. Create unauthorized user account (will attempt deletion)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedAuth = await authorize_member_join(unauthorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(unauthorizedAuth);
  // 4. All members subscribe to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    ownerConnection,
    {
      body: { community_id: community.id },
    },
  );
  await generate_random_reddit_clone_member_subscriptions_create(
    authorConnection,
    {
      body: { community_id: community.id },
    },
  );
  await generate_random_reddit_clone_member_subscriptions_create(
    unauthorizedConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 5. Community owner creates a post
  const post = await generate_random_reddit_clone_member_posts_create(
    ownerConnection,
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
  // 6. Comment author creates a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(comment);
  // 7. Unauthorized user attempts to delete the comment (should fail with 403)
  // This validates that the system properly enforces ownership-based access control
  await TestValidator.error(
    "unauthorized user cannot delete comment they did not author",
    async () => {
      await api.functional.redditClone.member.posts.comments.erase(
        unauthorizedConnection,
        {
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );
  // 8. Validate the comment structure is intact
  // The comment was successfully created and the deletion was rejected
  TestValidator.equals(
    "comment author is the member who created it",
    comment.author.id,
    authorAuth.id,
  );
  TestValidator.predicate("comment body is not empty", comment.body.length > 0);
  TestValidator.equals(
    "comment belongs to the correct post",
    comment.post.id,
    post.id,
  );
  TestValidator.equals(
    "comment belongs to the correct community",
    comment.post.community.id,
    community.id,
  );
}
