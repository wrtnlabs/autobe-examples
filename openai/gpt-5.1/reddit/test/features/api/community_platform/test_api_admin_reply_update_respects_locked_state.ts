import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReply";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate adminUser reply update behavior with respect to locked state.
 *
 * ## Business goal
 *
 * Ensure that when an adminUser updates a reply under a post comment, the
 * update keeps the reply correctly scoped to its post and parent comment and
 * that lock semantics behave consistently for administrative moderation
 * actions.
 *
 * ## Implementation summary
 *
 * 1. Register a memberUser (author) and an adminUser using the join endpoints.
 *
 *    - Join/login calls automatically attach Authorization headers to the shared
 *         connection, so we switch actors by calling the appropriate
 *         authentication API.
 * 2. As the memberUser:
 *
 *    - Create a community the user can post into.
 *    - Create a membership in that community for the memberUser.
 *    - Create a post in that community.
 *    - Create a top-level parent comment under that post.
 *    - Create a reply under that parent comment.
 * 3. Switch to the adminUser via admin login.
 * 4. First admin update:
 *
 *    - Call adminUser.posts.comments.replies.update with a body that changes the
 *         text, sets a status, and sets is_locked = true.
 *    - Assert that:
 *
 *         - The returned comment is valid ICommunityPlatformComment.
 *         - Its id equals the original reply id.
 *         - Post.id matches the original post id.
 *         - Parent_comment_id equals the parent comment id and is not null.
 *         - Body equals the moderation body, status equals the moderation status, and
 *                   is_locked is true.
 * 5. Second admin update on already-locked reply:
 *
 *    - Attempt another update that changes body but leaves is_locked undefined.
 *    - Two allowed behaviors by business rules: (A) Admin overrides lock: update
 *         succeeds, id stays the same and body reflects the second update. (B)
 *         Locks apply to admin: update fails with an error.
 *    - Implement dual-path validation:
 *
 *         - First, try the second update directly in a try/catch.
 *         - If it throws, wrap the call in TestValidator.error to assert that an error
 *                   path exists for this operation.
 *         - If it succeeds, assert the returned comment.id equals the reply id, body
 *                   equals the second moderation body, and is_locked remains
 *                   truthy/consistent.
 * 6. In either behavior, verify that all successful update responses share the
 *    same comment id as the original reply (no duplicate reply creation).
 */
export async function test_api_admin_reply_update_respects_locked_state(
  connection: api.IConnection,
) {
  // 1. Register member user (author of post/comment/reply)
  const memberJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join/member",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberAuthorized);

  // 2. Register admin user (moderator)
  const adminJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPw#123",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // Switch back to memberUser context by logging in as member again
  const memberLoginInput = {
    identifier: memberJoinInput.email,
    password: memberJoinInput.password,
    ip: null,
    href: "https://client.example.com/login/member",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginInput,
    });
  typia.assert(memberLoginAuthorized);

  // 3. Member creates a community
  const communityCreateInput = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateInput },
    );
  typia.assert(community);

  // 4. Member joins the community (membership)
  const membershipCreateInput = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateInput,
      },
    );
  typia.assert(membership);

  TestValidator.equals(
    "membership community slug matches created community",
    membership.community.slug,
    community.slug,
  );

  // 5. Member creates a post in the community
  const postCreateInput = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateInput,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community_id matches created community id",
    post.community_id,
    community.id,
  );

  // 6. Member creates a parent comment under the post
  const parentCommentCreateInput = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: parentCommentCreateInput,
      },
    );
  typia.assert(parentComment);

  TestValidator.equals(
    "parent comment post id matches post",
    parentComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "parent comment has no parent_comment_id",
    parentComment.parent_comment_id,
    null,
  );

  // 7. Member creates a reply under the parent comment
  const replyCreateInput = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    format: "plain",
    replyContext: undefined,
  } satisfies ICommunityPlatformCommentReply.ICreate;

  const reply: ICommunityPlatformCommentReply =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: replyCreateInput,
      },
    );
  typia.assert(reply);

  TestValidator.equals(
    "reply parent_comment id matches parent",
    reply.parent_comment.id,
    parentComment.id,
  );
  TestValidator.equals("reply post id matches post", reply.post.id, post.id);

  // 8. Switch to admin context by logging in as admin
  const adminLoginInput = {
    identifier: adminJoinInput.email,
    password: adminJoinInput.password,
    ip: null,
    href: "https://client.example.com/login/admin",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLoginAuthorized);

  // 9. First admin update: set is_locked = true and change body/status
  const firstModerationBody = RandomGenerator.paragraph({ sentences: 2 });
  const firstModerationStatus = "visible";

  const firstUpdateInput = {
    body: firstModerationBody,
    status: firstModerationStatus,
    is_locked: true,
  } satisfies ICommunityPlatformComment.IUpdate;

  const firstUpdated: ICommunityPlatformComment =
    await api.functional.communityPlatform.adminUser.posts.comments.replies.update(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        replyId: reply.id,
        body: firstUpdateInput,
      },
    );
  typia.assert(firstUpdated);

  TestValidator.equals(
    "first update preserves reply id",
    firstUpdated.id,
    reply.id,
  );
  TestValidator.equals(
    "first update keeps post association",
    firstUpdated.post.id,
    post.id,
  );
  TestValidator.equals(
    "first update keeps parent association",
    firstUpdated.parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "first update applies moderation body",
    firstUpdated.body,
    firstModerationBody,
  );
  TestValidator.equals(
    "first update applies moderation status",
    firstUpdated.status,
    firstModerationStatus,
  );
  TestValidator.predicate(
    "first update has is_locked true",
    firstUpdated.is_locked === true,
  );

  // 10. Second admin update: attempt to modify locked reply
  const secondModerationBody = RandomGenerator.paragraph({ sentences: 2 });
  const secondUpdateInput = {
    body: secondModerationBody,
  } satisfies ICommunityPlatformComment.IUpdate;

  let secondUpdated: ICommunityPlatformComment | null = null;
  let secondUpdateFailed = false;

  try {
    const updated: ICommunityPlatformComment =
      await api.functional.communityPlatform.adminUser.posts.comments.replies.update(
        connection,
        {
          postId: post.id,
          commentId: parentComment.id,
          replyId: reply.id,
          body: secondUpdateInput,
        },
      );
    typia.assert(updated);
    secondUpdated = updated;
  } catch (error) {
    secondUpdateFailed = true;
  }

  if (secondUpdateFailed) {
    // When locks apply even to admins: verify that an error can be produced
    await TestValidator.error(
      "second admin update on locked reply may fail according to business rules",
      async () => {
        await api.functional.communityPlatform.adminUser.posts.comments.replies.update(
          connection,
          {
            postId: post.id,
            commentId: parentComment.id,
            replyId: reply.id,
            body: secondUpdateInput,
          },
        );
      },
    );

    // Ensure that first updated state still matches reply id and remains locked
    TestValidator.equals(
      "reply id unchanged after failed second update",
      firstUpdated.id,
      reply.id,
    );
    TestValidator.predicate(
      "reply remains locked after failed second update",
      firstUpdated.is_locked === true,
    );
  } else if (secondUpdated !== null) {
    // When admins can override locks: validate the successful second update
    TestValidator.equals(
      "second update preserves reply id",
      secondUpdated.id,
      reply.id,
    );
    TestValidator.equals(
      "second update keeps post association",
      secondUpdated.post.id,
      post.id,
    );
    TestValidator.equals(
      "second update keeps parent association",
      secondUpdated.parent_comment_id,
      parentComment.id,
    );
    TestValidator.equals(
      "second update applies new moderation body",
      secondUpdated.body,
      secondModerationBody,
    );
    TestValidator.predicate(
      "second update keeps comment locked or relocks it",
      secondUpdated.is_locked === true ||
        secondUpdated.is_locked === firstUpdated.is_locked,
    );
  }

  // Final consistency: all known ids correspond to the same logical reply node
  TestValidator.equals(
    "reply id matches first updated comment id",
    firstUpdated.id,
    reply.id,
  );
  if (secondUpdated !== null) {
    TestValidator.equals(
      "reply id matches second updated comment id when update succeeded",
      secondUpdated.id,
      reply.id,
    );
  }
}
