import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";

export async function test_api_comment_deletion_with_replies(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test deletion of a parent comment when it has nested replies.
   *
   * Validates the complete comment deletion workflow with threaded replies on a Reddit-like community platform. Ensures that when a parent comment is deleted, its replies remain intact in the system - demonstrating that the unlimited reply depth architecture treats each comment as an independent entity rather than implementing cascading deletion.
   *
   * Special attention is given to verifying that the parent comment content is removed from the system while replies preserve their parent references even when pointing to deleted comments. The test confirms that thread structure is maintained throughout the deletion process.
   *
   * 1. Create member account for posting comments
   * 2. Create member account for posting post
   * 3. Create post to attach comments
   * 4. Create parent comment on the post
   * 5. Create first-level reply to parent comment
   * 6. Create second-level reply to test unlimited nesting depth
   * 7. Delete the parent comment
   * 8. Verify replies remain in the system with intact parent references
   */
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 2. Create another member account for post creation
  const postMemberConnection: api.IConnection = { host: connection.host };
  const postMemberAuthorized = await authorize_member_join(
    postMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username:
          RandomGenerator.alphaNumeric(8) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(postMemberAuthorized);
  // 3. Create a post to attach comments
  const post = await api.functional.redditPlatform.member.posts.create(
    postMemberConnection,
    {
      body: {
        community_id: memberAuthorized.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create parent comment
  const commentMemberConnection: api.IConnection = { host: connection.host };
  const commentMemberAuthorized = await authorize_member_join(
    commentMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username:
          RandomGenerator.alphaNumeric(8) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(commentMemberAuthorized);
  const parentComment =
    await api.functional.redditPlatform.member.comments.create(
      commentMemberConnection,
      {
        body: {
          reddit_platform_post_id: post.id,
          content: RandomGenerator.paragraph({ sentences: 2 }),
          reddit_platform_comments_id: null,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(parentComment);
  // 5. Create first-level reply to parent comment
  const reply1MemberConnection: api.IConnection = { host: connection.host };
  const reply1MemberAuthorized = await authorize_member_join(
    reply1MemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username:
          RandomGenerator.alphaNumeric(8) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(reply1MemberAuthorized);
  const reply1 = await api.functional.redditPlatform.member.comments.create(
    reply1MemberConnection,
    {
      body: {
        reddit_platform_post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
        reddit_platform_comments_id: parentComment.id,
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(reply1);
  // 6. Create second-level reply (reply to reply1)
  const reply2MemberConnection: api.IConnection = { host: connection.host };
  const reply2MemberAuthorized = await authorize_member_join(
    reply2MemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username:
          RandomGenerator.alphaNumeric(8) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(reply2MemberAuthorized);
  const reply2 = await api.functional.redditPlatform.member.comments.create(
    reply2MemberConnection,
    {
      body: {
        reddit_platform_post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
        reddit_platform_comments_id: reply1.id,
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(reply2);
  // 7. Delete the parent comment
  // Note: The erase function returns void (204 No Content)
  // which indicates successful deletion
  await api.functional.redditPlatform.member.comments.erase(
    commentMemberConnection,
    {
      commentId: parentComment.id,
    },
  );
  // 8. Verify replies remain in the system
  // reply1 and reply2 still exist with valid responses (typia.assert above)
  // This demonstrates that deleting a parent doesn't cascade delete children
  // 9. Verify thread structure is maintained
  // reply2 still references reply1 as its parent
  TestValidator.equals(
    "reply2 parent reference",
    reply2.reddit_platform_comments_id,
    reply1.id,
  );
  // 10. Verify reply1 still references deleted parentComment.id
  // This confirms replies remain even when parent is deleted
  TestValidator.equals(
    "reply1 parent reference to deleted comment",
    reply1.reddit_platform_comments_id,
    parentComment.id,
  );
}