import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test comment reply threading functionality.
 * 1. Create a member and authenticate
 * 2. Create a community and subscribe
 * 3. Create a target post
 * 4. Create a parent comment (top-level)
 * 5. Create a reply comment with parent_comment_id
 * 6. Validate the reply's parent reference
 * 7. Verify threading structure is preserved
 */
export async function test_api_comment_reply_threading(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community (owner auto-subscribes, but test explicit subscription)
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create target post
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create parent comment (top-level, no parent_comment_id)
  const parentComment =
    await generate_random_reddit_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: null,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(parentComment);
  // Validate parent comment is top-level (no parent)
  TestValidator.predicate(
    "parent comment has no parent",
    parentComment.parent === null || parentComment.parent === undefined,
  );
  // 6. Create reply comment with parent_comment_id
  const replyComment =
    await generate_random_reddit_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: parentComment.id,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(replyComment);
  // 7. Validate reply has parent reference
  TestValidator.predicate(
    "reply has parent reference",
    replyComment.parent !== null && replyComment.parent !== undefined,
  );
  // 8. Validate reply's parent_comment_id matches parent's id
  TestValidator.equals(
    "reply parent id matches parent comment id",
    replyComment.parent!.id,
    parentComment.id,
  );
  // 9. Verify parent's body is preserved in reference
  TestValidator.equals(
    "parent body preserved in reference",
    replyComment.parent!.body,
    parentComment.body,
  );
  // 10. Verify parent's author is preserved
  TestValidator.equals(
    "parent author preserved in reference",
    replyComment.parent!.author.id,
    parentComment.author.id,
  );
  // 11. Verify parent's vote score is preserved
  TestValidator.equals(
    "parent vote score preserved in reference",
    replyComment.parent!.vote_score,
    parentComment.voteScore,
  );
  // 12. Test nested reply (reply to reply) - unlimited depth
  const nestedReply =
    await generate_random_reddit_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: replyComment.id,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(nestedReply);
  // 13. Validate nested reply's parent is the reply comment
  TestValidator.equals(
    "nested reply parent id matches reply id",
    nestedReply.parent!.id,
    replyComment.id,
  );
  // 14. Verify the threading chain is preserved
  TestValidator.equals(
    "nested reply grandparent preserved",
    (typia.assert<IRedditPlatformComment>(nestedReply.parent!) as IRedditPlatformComment).parent?.id,
    parentComment.id,
  );
}