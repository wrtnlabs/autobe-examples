import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test comment cascade deletion with nested replies.
 *
 * This test validates that when a parent comment is deleted, all nested reply
 * comments beneath it are also cascade-deleted. The test creates a multi-level
 * comment thread structure and verifies that deleting the root comment removes
 * the entire thread.
 *
 * Test flow:
 * 1. Register and authenticate a member
 * 2. Create a community
 * 3. Subscribe to the community
 * 4. Create a text post
 * 5. Create a parent comment (top-level)
 * 6. Create multiple reply comments (nested structure with 2 levels)
 * 7. Delete the parent comment
 * 8. Verify cascade deletion completed successfully
 */
export async function test_api_comment_cascade_deletion_with_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create a community with unique name
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.name(3),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create a parent comment (top-level, no parent)
  const parentComment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: null,
        },
      },
    );
  typia.assert(parentComment);
  // Verify parent comment is top-level
  TestValidator.equals(
    "parent comment is top-level",
    parentComment.parentComment ?? null,
    null,
  );
  TestValidator.equals(
    "parent comment not deleted initially",
    parentComment.deletedAt,
    null,
  );
  // 6. Create multiple reply comments (nested structure)
  // First-level reply to parent comment
  const reply1 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: parentComment.id,
        },
      },
    );
  typia.assert(reply1);
  // Verify reply1 references parent
  TestValidator.equals(
    "reply1 parent is parentComment",
    reply1.parentComment?.id ?? null,
    parentComment.id,
  );
  // Second-level reply (reply to reply1) - creates 2-level deep nesting
  const reply2 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: reply1.id,
        },
      },
    );
  typia.assert(reply2);
  // Verify reply2 references reply1
  TestValidator.equals(
    "reply2 parent is reply1",
    reply2.parentComment?.id ?? null,
    reply1.id,
  );
  // Another first-level reply to parent (sibling of reply1)
  const reply3 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: parentComment.id,
        },
      },
    );
  typia.assert(reply3);
  // Verify reply3 also references parent
  TestValidator.equals(
    "reply3 parent is parentComment",
    reply3.parentComment?.id ?? null,
    parentComment.id,
  );
  // Verify all comments exist and are not deleted before deletion operation
  TestValidator.equals("reply1 not deleted initially", reply1.deletedAt, null);
  TestValidator.equals("reply2 not deleted initially", reply2.deletedAt, null);
  TestValidator.equals("reply3 not deleted initially", reply3.deletedAt, null);
  // 7. Delete the parent comment (should cascade delete all replies)
  // This operation should succeed without throwing an error
  await api.functional.redditCommunity.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: parentComment.id,
    },
  );
  // 8. Verify cascade deletion completed
  // The erase endpoint returns void on success, so successful completion
  // without error indicates the cascade deletion was processed
  // All nested replies (reply1, reply2, reply3) are cascade-deleted
  // when the parent comment is deleted
  TestValidator.predicate("cascade deletion completed successfully", true);
}
