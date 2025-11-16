import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Verify admin hard delete behavior for non-existent comments.
 *
 * Business goal
 *
 * - Ensure that when an adminUser attempts to hard-delete a comment for a
 *   specific post using DELETE
 *   /communityPlatform/adminUser/posts/{postId}/comments/{commentId}, and that
 *   comment does not exist for the given post, the API fails with an error
 *   instead of silently succeeding.
 * - Confirm that the dual-key constraint on (postId, commentId) is enforced at
 *   the domain level.
 * - Because only the erase endpoint is exposed for comments in the provided SDK,
 *   we do not verify post/comment side effects beyond the error occurrence.
 *
 * High-level workflow
 *
 * 1. Create and authenticate an adminUser via /auth/adminUser/join.
 * 2. Create and authenticate a memberUser via /auth/memberUser/join.
 * 3. As memberUser, create a community.
 * 4. As memberUser, join the created community as a member.
 * 5. As memberUser, create a post within that community.
 * 6. Generate a random UUID to use as a fake commentId which is guaranteed not to
 *    refer to any actual comment for this post (no comment APIs are used in
 *    this test at all).
 * 7. Switch authentication back to adminUser via /auth/adminUser/login.
 * 8. As adminUser, call
 *    /communityPlatform/adminUser/posts/{postId}/comments/{commentId} with the
 *    real post.id and the fake commentId and assert that the call fails (i.e.,
 *    throws an error) using TestValidator.error.
 *
 * Notes & constraints
 *
 * - We must not attempt to validate error status codes or messages; we only
 *   assert that an error is thrown.
 * - We never manipulate connection.headers directly; authentication switching is
 *   performed exclusively via the provided auth APIs.
 * - Request bodies strictly follow their DTO types and are created with the
 *   `satisfies` operator for type safety.
 */
export async function test_api_admin_comment_hard_delete_nonexistent_comment(
  connection: api.IConnection,
) {
  // 1. Register an admin user (implicitly authenticates as adminUser)
  const adminUsername: string = RandomGenerator.name(1);
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdminUserJoin.IRequest,
    });
  typia.assert(adminAuthorized);

  // 2. Register a member user (implicitly authenticates as memberUser)
  const memberUsername: string & tags.MinLength<3> & tags.MaxLength<32> =
    typia.random<string & tags.MinLength<3> & tags.MaxLength<32>>();
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string & tags.MinLength<8> = typia.random<
    string & tags.MinLength<8>
  >();

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        ip: null,
        href: "https://client.example.com/join",
        referrer: "https://client.example.com/landing",
      } satisfies ICommunityPlatformMemberuser.IJoin,
    });
  typia.assert(memberAuthorized);

  // 3. As memberUser, create a community
  const communitySlug: string & tags.MinLength<1> & tags.MaxLength<128> =
    typia.random<string & tags.MinLength<1> & tags.MaxLength<128>>();
  const communityName: string & tags.MinLength<1> & tags.MaxLength<255> =
    typia.random<string & tags.MinLength<1> & tags.MaxLength<255>>();

  const communityCreateBody = {
    slug: communitySlug,
    name: communityName,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
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

  // 4. As memberUser, join the community
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

  // 5. As memberUser, create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 6. Generate a fake commentId (non-existent for this post)
  const fakeCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 7. Switch authentication back to adminUser via login
  const adminLoginBody = {
    identifier: adminUsername,
    password: adminPassword,
    ip: null,
    href: "https://client.example.com/admin/login",
    referrer: "https://client.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 8. As adminUser, attempt to hard-delete the non-existent comment and
  //    assert that an error is thrown.
  await TestValidator.error(
    "admin erase non-existent comment must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.posts.comments.erase(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          commentId: fakeCommentId,
        },
      );
    },
  );
}
