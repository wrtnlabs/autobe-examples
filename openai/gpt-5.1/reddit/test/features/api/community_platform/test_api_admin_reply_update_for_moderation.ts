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
 * Validate that an authenticated adminUser can moderate and update a
 * member-authored reply.
 *
 * Full business flow:
 *
 * 1. Admin registration and implicit authentication using auth.adminUser.join.
 * 2. Member registration and implicit authentication using auth.memberUser.join.
 * 3. Acting as memberUser, create a community via
 *    communityPlatform.memberUser.communities.create.
 * 4. Acting as memberUser, create a membership in that community via
 *    communities.memberships.create.
 * 5. Acting as memberUser, create a post in that community via
 *    memberUser.posts.create.
 * 6. Acting as memberUser, create a top-level comment under the post via
 *    posts.comments.create.
 * 7. Acting as memberUser, create a reply under that comment via
 *    posts.comments.replies.create.
 * 8. Switch actor to adminUser using auth.adminUser.login so that subsequent calls
 *    are made as admin.
 * 9. As adminUser, call adminUser.posts.comments.replies.update with an
 *    ICommunityPlatformComment.IUpdate body that (a) updates the reply text
 *    body to a sanitized/annotated version and (b) flips/modifies the status to
 *    a moderation-specific value like "moderated".
 *
 * Validations:
 *
 * - The update call returns a valid ICommunityPlatformComment object.
 * - The returned comment.id equals the original reply id from the memberUser
 *   flow.
 * - The returned comment.post.id equals the original post id.
 * - The returned comment.parent_comment_id equals the original parent comment id
 *   (thread association preserved).
 * - The author.id on the updated comment still equals the memberUser.id (admin
 *   did not become the author).
 * - The body field matches the admin-provided moderated value.
 * - The status field matches the moderation status string used in the update.
 * - Updated_at is strictly later than created_at, proving an update occurred.
 * - The operation succeeds even though the admin is not the reply author,
 *   confirming elevated moderation rights.
 */
export async function test_api_admin_reply_update_for_moderation(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) with deterministic, realistic values
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(8)}`,
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: "Adm1n!Pass", // satisfies Format<"password">
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminId = adminAuthorized.id;

  // 2. Member registration (join)
  const memberJoinBody = {
    username: `member_${RandomGenerator.alphabets(8)}` as string &
      tags.MinLength<3> &
      tags.MaxLength<32>,
    email: `${RandomGenerator.alphabets(8)}@member.test` as string &
      tags.Format<"email">,
    password: "Memb3r!Pass" as string & tags.MinLength<8>,
    ip: null,
    href: "https://client.test/join" as string & tags.Format<"uri">,
    referrer: "https://client.test/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;

  // 3. As memberUser, create a community
  const communitySlugBase = RandomGenerator.alphabets(12);
  const communityCreateBody = {
    slug: communitySlugBase as string & tags.MinLength<1> & tags.MaxLength<128>,
    name: `Community ${communitySlugBase}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }) as string & tags.MaxLength<4000>,
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. As memberUser, create a membership in that community
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  TestValidator.equals(
    "membership community id matches created community",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership member user id matches member account",
    membership.memberUser.id,
    memberId,
  );

  // 5. As memberUser, create a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 6. As memberUser, create a top-level comment under the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }) as string & tags.MinLength<1> & tags.MaxLength<10000>,
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(parentComment);

  // 7. As memberUser, create a reply under that comment
  const replyCreateBody = {
    body: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }) as string & tags.MinLength<1> & tags.MaxLength<10000>,
    format: "markdown",
    replyContext: "original member reply",
  } satisfies ICommunityPlatformCommentReply.ICreate;

  const reply: ICommunityPlatformCommentReply =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: replyCreateBody,
      },
    );
  typia.assert(reply);

  // Capture baseline identifiers and timestamps for later comparison
  const replyId = reply.id;
  const replyCreatedAt = reply.created_at;
  const parentCommentId = parentComment.id;
  const postId = post.id;
  const replyAuthorId = reply.author.id;

  // Sanity checks for associations
  TestValidator.equals("reply post id matches post id", reply.post.id, postId);
  TestValidator.equals(
    "reply parent comment summary id matches parent comment id",
    reply.parent_comment.id,
    parentCommentId,
  );
  TestValidator.equals(
    "reply author id matches member user id",
    replyAuthorId,
    memberId,
  );

  // 8. Switch actor to adminUser using admin login
  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.test/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  TestValidator.equals(
    "admin login returns same admin id",
    adminLoginAuthorized.id,
    adminId,
  );

  // 9. As adminUser, update the reply for moderation using ICommunityPlatformComment.IUpdate
  const moderatedBodyText = `[moderated] ${reply.content}`;
  const moderationStatus = "moderated";

  const adminUpdateBody = {
    body: moderatedBodyText,
    status: moderationStatus,
    is_locked: undefined,
  } satisfies ICommunityPlatformComment.IUpdate;

  const updatedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.adminUser.posts.comments.replies.update(
      connection,
      {
        postId,
        commentId: parentCommentId,
        replyId,
        body: adminUpdateBody,
      },
    );
  typia.assert(updatedComment);

  // Validate identity and relationships are preserved
  TestValidator.equals(
    "updated comment id should equal original reply id",
    updatedComment.id,
    replyId,
  );
  TestValidator.equals(
    "updated comment post id should still match post",
    updatedComment.post.id,
    postId,
  );
  TestValidator.equals(
    "updated comment parent_comment_id should still match parent comment",
    updatedComment.parent_comment_id,
    parentCommentId,
  );
  TestValidator.equals(
    "updated comment author id should remain original member user",
    updatedComment.author.id,
    replyAuthorId,
  );

  // Validate moderation changes applied
  TestValidator.equals(
    "updated comment body reflects admin moderated text",
    updatedComment.body,
    moderatedBodyText,
  );
  TestValidator.equals(
    "updated comment status reflects moderation status",
    updatedComment.status,
    moderationStatus,
  );

  // Validate timestamp semantics: updated_at > original created_at
  const parsedCreatedAt = new Date(replyCreatedAt).getTime();
  const parsedUpdatedAt = new Date(updatedComment.updated_at).getTime();

  await TestValidator.predicate(
    "updated_at should be strictly after created_at",
    async () => {
      return parsedUpdatedAt > parsedCreatedAt;
    },
  );

  // Confirm that admin could update despite not being the author
  TestValidator.notEquals(
    "admin id and reply author id should differ, proving cross-actor moderation",
    adminId,
    replyAuthorId,
  );
}
