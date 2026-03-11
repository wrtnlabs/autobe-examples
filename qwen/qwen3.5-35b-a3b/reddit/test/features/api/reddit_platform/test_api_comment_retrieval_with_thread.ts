import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

/**
 * Test comment retrieval with complete thread context including nested replies.
 * Creates a comment hierarchy: top-level comment -> reply -> nested reply.
 * Verifies that the hierarchical structure is preserved with proper parent-child
 * relationships and that both authenticated and guest users can access the data.
 */
export async function test_api_comment_retrieval_with_thread(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test member (authenticated user)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a community for the post
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Generate a mock post (no post creation API available)
  const mockPost = typia.random<IRedditPlatformPost.ISummary>();
  typia.assert(mockPost);
  // 4. Create a top-level comment on the post (Comment A)
  const commentACreation =
    await api.functional.redditPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          post_id: mockPost.id,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(commentACreation);
  // 5. Create a reply to Comment A (Comment B)
  const commentBCreation =
    await api.functional.redditPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          parent_comment_id: commentACreation.id,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(commentBCreation);
  // 6. Create a nested reply to Comment B (Comment C)
  const commentCCreation =
    await api.functional.redditPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          parent_comment_id: commentBCreation.id,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(commentCCreation);
  // 7. Retrieve Comment A with both authenticated and guest connections
  // 7.1 Test with authenticated member
  const retrievedFromAuthenticated =
    await api.functional.redditPlatform.comments.at(memberConnection, {
      commentId: commentACreation.id,
    });
  typia.assert(retrievedFromAuthenticated);
  // 7.2 Test with guest (separate connection without token)
  const guestConnection: api.IConnection = { host: connection.host };
  const retrievedFromGuest = await api.functional.redditPlatform.comments.at(
    guestConnection,
    {
      commentId: commentACreation.id,
    },
  );
  typia.assert(retrievedFromGuest);
  // 8. Validate hierarchical structure for authenticated user
  // 8.1 Verify Comment A's own content and metadata
  TestValidator.equals(
    "comment A content",
    retrievedFromAuthenticated.content,
    commentACreation.content,
  );
  TestValidator.equals(
    "comment A author username",
    retrievedFromAuthenticated.author.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "comment A vote score",
    retrievedFromAuthenticated.vote_score,
    0,
  );
  // 8.2 Verify post object is included for top-level comment
  TestValidator.equals(
    "comment A has post reference",
    retrievedFromAuthenticated.post?.id,
    mockPost.id,
  );
  TestValidator.equals(
    "comment A post title",
    retrievedFromAuthenticated.post?.title,
    mockPost.title,
  );
  // 8.3 Verify parent is null for top-level comment
  TestValidator.equals(
    "comment A parent is null",
    retrievedFromAuthenticated.parent,
    null,
  );
  // 8.4 Verify replies structure
  TestValidator.equals(
    "comment A has one reply",
    retrievedFromAuthenticated.replies.length,
    1,
  );
  // 8.5 Verify Comment B (first reply) - cast to full type to access nested replies
  const replyB = retrievedFromAuthenticated
    .replies[0] as IRedditPlatformComment;
  TestValidator.equals(
    "reply B content",
    replyB.content,
    commentBCreation.content,
  );
  TestValidator.equals(
    "reply B author username",
    replyB.author.username,
    memberAuth.username,
  );
  // 8.6 Verify Comment B's replies (Comment C) - cast to full type
  TestValidator.equals(
    "reply B has one nested reply",
    replyB.replies.length,
    1,
  );
  const replyC = replyB.replies[0] as IRedditPlatformComment;
  TestValidator.equals(
    "reply C content",
    replyC.content,
    commentCCreation.content,
  );
  TestValidator.equals(
    "reply C author username",
    replyC.author.username,
    memberAuth.username,
  );
  // 9. Validate hierarchical structure for guest user (same data, unauthenticated)
  TestValidator.equals(
    "guest - comment A content",
    retrievedFromGuest.content,
    retrievedFromAuthenticated.content,
  );
  TestValidator.equals(
    "guest - comment A author username",
    retrievedFromGuest.author.username,
    retrievedFromAuthenticated.author.username,
  );
  TestValidator.equals(
    "guest - comment A vote score",
    retrievedFromGuest.vote_score,
    retrievedFromAuthenticated.vote_score,
  );
  TestValidator.equals(
    "guest - comment A post reference",
    retrievedFromGuest.post?.id,
    retrievedFromAuthenticated.post?.id,
  );
  TestValidator.equals(
    "guest - replies length",
    retrievedFromGuest.replies.length,
    retrievedFromAuthenticated.replies.length,
  );
  // 9.1 Validate nested replies for guest
  const guestReplyB = retrievedFromGuest.replies[0] as IRedditPlatformComment;
  TestValidator.equals("guest - reply B exists", guestReplyB.id, replyB.id);
  TestValidator.equals(
    "guest - nested reply C exists",
    guestReplyB.replies.length,
    replyB.replies.length,
  );
}
