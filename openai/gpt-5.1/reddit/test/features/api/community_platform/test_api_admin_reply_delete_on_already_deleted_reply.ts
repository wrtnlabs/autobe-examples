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
 * Validate admin deleting an already-deleted reply behaves safely.
 *
 * Business context:
 *
 * - Admin moderation workflows may replay delete operations (e.g., via retries or
 *   duplicate events). Deleting a reply that has already been deleted must not
 *   succeed as if the reply still existed, but also must not corrupt state.
 *
 * End-to-end scenario:
 *
 * 1. A memberUser registers (join) and becomes authenticated.
 * 2. The memberUser creates a community.
 * 3. The memberUser joins the community (membership create).
 * 4. The memberUser creates a post inside that community.
 * 5. The memberUser creates a top-level comment on the post.
 * 6. The memberUser creates a reply under that comment.
 * 7. An adminUser registers and then logs in (explicit admin context).
 * 8. As adminUser, DELETE the reply once (should succeed without error).
 * 9. As adminUser, DELETE the same reply again (should now fail with an HttpError,
 *    such as 404/410/4xx/5xx, rather than behaving like a fresh delete).
 *
 * Due to the SDK exposing only the DELETE endpoint for admin replies and no
 * corresponding GET or list endpoints, this test validates behavior purely via
 * success vs HttpError on repeated delete calls, not via explicit re-fetching
 * of state.
 */
export async function test_api_admin_reply_delete_on_already_deleted_reply(
  connection: api.IConnection,
) {
  // 1. memberUser joins (register + authorized context)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. memberUser creates a community
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. memberUser joins the community (membership)
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

  // 4. memberUser creates a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. memberUser creates a top-level comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 6. memberUser creates a reply under that comment
  const replyCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    format: "plain" as const,
    replyContext: undefined,
  } satisfies ICommunityPlatformCommentReply.ICreate;

  const reply: ICommunityPlatformCommentReply =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: replyCreateBody,
      },
    );
  typia.assert(reply);

  // 7. adminUser joins
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 7b. Explicit admin login (actor switching robustness)
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 8. First delete as admin: should succeed without throwing
  await api.functional.communityPlatform.adminUser.posts.comments.replies.erase(
    connection,
    {
      postId: post.id,
      commentId: comment.id,
      replyId: reply.id,
    },
  );

  // 9. Second delete on same reply: expect an HttpError, not a silent success
  await TestValidator.httpError(
    "second delete on already deleted reply should result in HttpError",
    [404, 410, 400, 403, 409, 422, 500],
    async () => {
      await api.functional.communityPlatform.adminUser.posts.comments.replies.erase(
        connection,
        {
          postId: post.id,
          commentId: comment.id,
          replyId: reply.id,
        },
      );
    },
  );
}
