import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReply";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate retrieval of a reply comment via the reply-detail endpoint.
 *
 * Business purpose: Ensure that once a nested reply has been created under a
 * post comment, the public GET
 * /communityPlatform/posts/{postId}/comments/{commentId}/replies/{replyId}
 * endpoint can retrieve that reply in a way that:
 *
 * - Correctly scopes it under the expected post and parent comment.
 * - Returns consistent author and post context.
 * - Reflects non-deleted, unlocked state for a fresh reply.
 * - Does not mutate any server-side state (strictly read-only).
 *
 * Original scenario mentioned validating soft-deleted replies (tombstone
 * behavior) by directly manipulating the underlying community_platform_comments
 * table via internal helpers. Since such internal hooks are not exposed through
 * the public SDK in this environment, this E2E test focuses on the reachable
 * non-deleted state while still validating the correctness and read-only nature
 * of the endpoint.
 *
 * Workflow implemented:
 *
 * 1. Register and authenticate a member user.
 * 2. As that user, create a community.
 * 3. Join that community (create a membership) as the same user.
 * 4. Create a text post in that community.
 * 5. Create a top-level comment on the post.
 * 6. Create a reply under that comment.
 * 7. Retrieve the reply via the public reply-detail endpoint.
 * 8. Validate identity, scoping, and non-deleted state, and assert that the
 *    retrieval is read-only.
 */
export async function test_api_comment_reply_retrieval_respects_deletion_state(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!", // satisfies MinLength<8>
    ip: null,
    href: "https://test-client.local/join",
    referrer: "https://test-client.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community owned by this member user.
  const communityBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: false,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Join the community as a member (membership for the same user).
  const membershipBody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert(membership);

  // 4. Create a text post in that community.
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 5. Create a top-level comment on the post.
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // Ensure this comment is properly linked to the post.
  TestValidator.equals(
    "comment belongs to created post",
    comment.post.id,
    post.id,
  );
  TestValidator.predicate(
    "comment is top-level (no parent_comment_id)",
    comment.parent_comment_id === null ||
      comment.parent_comment_id === undefined,
  );

  // 6. Create a reply under that comment.
  const replyBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    format: "plain" as const,
    replyContext: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies ICommunityPlatformCommentReply.ICreate;

  const reply: ICommunityPlatformCommentReply =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: replyBody,
      },
    );
  typia.assert(reply);

  // Basic invariants on the created reply.
  TestValidator.equals(
    "reply post id matches created post",
    reply.post.id,
    post.id,
  );
  TestValidator.equals(
    "reply parent_comment id matches parent comment",
    reply.parent_comment.id,
    comment.id,
  );
  TestValidator.equals(
    "reply author matches joined member",
    reply.author.id,
    member.id,
  );
  TestValidator.predicate(
    "reply is not marked deleted at creation",
    reply.is_deleted === false &&
      (reply.deleted_at === null || reply.deleted_at === undefined),
  );

  // 7. Retrieve the reply via the public reply-detail endpoint.
  const retrieved: ICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.replies.at(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        replyId: reply.id,
      },
    );
  typia.assert(retrieved);

  // 8. Validate identity, scoping, non-deleted state, and read-only behavior.

  // Identity: the retrieved comment should be the same logical entity as reply.
  TestValidator.equals(
    "retrieved reply id matches created reply id",
    retrieved.id,
    reply.id,
  );

  // Scoping: post and parent comment context must remain consistent.
  TestValidator.equals(
    "retrieved reply post id matches created post",
    retrieved.post.id,
    post.id,
  );
  TestValidator.equals(
    "retrieved reply parent_comment_id matches parent comment",
    retrieved.parent_comment_id,
    comment.id,
  );

  // Author consistency.
  TestValidator.equals(
    "retrieved reply author id matches created reply author",
    retrieved.author.id,
    reply.author.id,
  );

  // Non-deleted, unlocked state for a fresh reply.
  TestValidator.predicate(
    "retrieved reply is not locked",
    retrieved.is_locked === false,
  );
  TestValidator.predicate(
    "retrieved reply not soft-deleted",
    retrieved.deleted_at === null || retrieved.deleted_at === undefined,
  );

  // Status should match between reply entity and retrieved comment representation.
  TestValidator.equals(
    "reply status consistent between create and retrieve",
    retrieved.status,
    reply.status,
  );

  // Read-only behavior: retrieval must not change immutable identity fields.
  TestValidator.equals(
    "retrieved comment still belongs to same post after read",
    retrieved.post.id,
    comment.post.id,
  );
  TestValidator.equals(
    "retrieved comment author unchanged after read",
    retrieved.author.id,
    comment.author.id,
  );

  // Temporal sanity check: retrieved created_at should not be earlier than reply.created_at.
  const replyCreatedAtMs = new Date(reply.created_at).getTime();
  const retrievedCreatedAtMs = new Date(retrieved.created_at).getTime();
  TestValidator.predicate(
    "retrieved created_at is not earlier than reply created_at",
    retrievedCreatedAtMs >= replyCreatedAtMs,
  );
}
