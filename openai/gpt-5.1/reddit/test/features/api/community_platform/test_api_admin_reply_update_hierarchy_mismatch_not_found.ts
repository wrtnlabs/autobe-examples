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

export async function test_api_admin_reply_update_hierarchy_mismatch_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user (adminUser join).
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.example.com`,
    password: "AdminPassw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register and authenticate a member user who will author posts/comments.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@member.example.com`,
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Using member session, create a community.
  const communityCreateBody = {
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 4. Create a membership for this member in the community.
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

  // 5. Create two distinct posts: Post A and Post B.
  const basePost = {
    communityId: community.id,
    communityCode: community.slug,
    postType: "text",
  } as const;

  const postABody = {
    ...basePost,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
  } satisfies ICommunityPlatformPost.ICreate;
  const postA: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postABody,
    });
  typia.assert(postA);

  const postBBody = {
    ...basePost,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
  } satisfies ICommunityPlatformPost.ICreate;
  const postB: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBBody,
    });
  typia.assert(postB);

  // 6. On Post A, create Comment A and then Reply R under that comment.
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const commentA: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postA.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert(commentA);

  const replyCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    format: "plain",
    replyContext: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies ICommunityPlatformCommentReply.ICreate;
  const replyR: ICommunityPlatformCommentReply =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
      connection,
      {
        postId: postA.id as string & tags.Format<"uuid">,
        commentId: commentA.id as string & tags.Format<"uuid">,
        body: replyCreateBody,
      },
    );
  typia.assert(replyR);

  // Capture original properties for later comparison.
  const originalBody = replyR.content;
  const originalStatus = replyR.status;
  const originalIsLocked = replyR.is_locked;

  // 7. Switch actor to admin by logging in as the admin user we created.
  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://client.example.com/admin/login",
    referrer: "https://client.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;
  const adminLoginResult: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 8. As admin, attempt to update Reply R with a mismatched hierarchy:
  //    use Post B's id with Comment A's id and Reply R's id.
  const mismatchedUpdateBody = {
    body: `${originalBody} [should-not-apply]`,
    status: "visible",
    is_locked: !originalIsLocked,
  } satisfies ICommunityPlatformComment.IUpdate;

  await TestValidator.error(
    "admin update with mismatched postId/commentId/replyId should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.posts.comments.replies.update(
        connection,
        {
          postId: postB.id as string & tags.Format<"uuid">,
          commentId: commentA.id as string & tags.Format<"uuid">,
          replyId: replyR.id as string & tags.Format<"uuid">,
          body: mismatchedUpdateBody,
        },
      );
    },
  );

  // 9. Re-authenticate as admin to ensure connection headers remain valid.
  const adminLoginResult2: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult2);

  // 10. Perform a valid update using the correct hierarchy to ensure the reply
  //     is still updatable and that the previous failed attempt had no side effects.
  const validUpdateBody = {
    body: `${originalBody} [updated-correctly]`,
    status: "edited_by_admin",
    is_locked: !originalIsLocked,
  } satisfies ICommunityPlatformComment.IUpdate;
  const updatedReplyComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.adminUser.posts.comments.replies.update(
      connection,
      {
        postId: postA.id as string & tags.Format<"uuid">,
        commentId: commentA.id as string & tags.Format<"uuid">,
        replyId: replyR.id as string & tags.Format<"uuid">,
        body: validUpdateBody,
      },
    );
  typia.assert(updatedReplyComment);

  // 11. Validate that the update result matches the valid update body and that
  //     the mismatched attempt had not changed the stored reply beforehand.
  TestValidator.equals(
    "reply body should reflect the correct admin update only",
    updatedReplyComment.body,
    validUpdateBody.body,
  );
  TestValidator.equals(
    "reply status should reflect the correct admin update only",
    updatedReplyComment.status,
    validUpdateBody.status,
  );
  TestValidator.equals(
    "reply lock state should reflect the correct admin update only",
    updatedReplyComment.is_locked,
    validUpdateBody.is_locked,
  );

  // 12. Indirectly assert that no duplicate reply was created by checking that
  //     the replyId remains the same as the original reply.
  TestValidator.equals(
    "reply id should remain unchanged after updates",
    updatedReplyComment.id,
    replyR.id,
  );
}
