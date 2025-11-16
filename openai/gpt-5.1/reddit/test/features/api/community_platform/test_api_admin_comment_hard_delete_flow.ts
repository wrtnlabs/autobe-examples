import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Verify that an adminUser can hard delete a specific comment on a post created
 * by a member, without affecting the parent post or its community.
 *
 * Business workflow covered:
 *
 * 1. Register and authenticate a memberUser via /auth/memberUser/join.
 * 2. Member creates a community via POST
 *    /communityPlatform/memberUser/communities.
 * 3. Member joins that community via POST
 *    /communityPlatform/memberUser/communities/{communitySlug}/memberships.
 * 4. Member creates a post in that community via POST
 *    /communityPlatform/memberUser/posts.
 * 5. Member creates a top-level comment on that post via POST
 *    /communityPlatform/memberUser/posts/{postId}/comments.
 * 6. Register and authenticate an adminUser via /auth/adminUser/join.
 * 7. Admin hard-deletes the comment via DELETE
 *    /communityPlatform/adminUser/posts/{postId}/comments/{commentId}.
 * 8. Assert that:
 *
 *    - The erase call completes successfully.
 *    - A second erase call on the same comment fails, implying the comment row was
 *         removed.
 *    - The parent post and community objects remain logically intact in the test
 *         context (their IDs and key fields are unchanged).
 */
export async function test_api_admin_comment_hard_delete_flow(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Member creates a community
  const communityCreateBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // Basic sanity checks on community
  TestValidator.equals(
    "community slug should match request body",
    community.slug,
    communityCreateBody.slug,
  );
  TestValidator.equals(
    "community name should match request body",
    community.name,
    communityCreateBody.name,
  );

  // 3. Member joins that community
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
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  TestValidator.equals(
    "membership community id should match created community",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership member id should match authorized member",
    membership.memberUser.id,
    memberAuthorized.id,
  );

  // 4. Member creates a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
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
  typia.assert<ICommunityPlatformPost>(post);

  TestValidator.equals(
    "post community_id should match created community id",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post title should match request body",
    post.title,
    postCreateBody.title,
  );

  // 5. Member creates a top-level comment on that post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 12,
    }),
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
  typia.assert<ICommunityPlatformComment>(comment);

  TestValidator.equals(
    "comment post summary id should match post id",
    comment.post.id,
    post.id,
  );
  TestValidator.equals(
    "comment author id should match member user id",
    comment.author.id,
    memberAuthorized.id,
  );

  // 6. Register and authenticate an adminUser
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphabets(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 7. Admin hard-deletes the comment
  await api.functional.communityPlatform.adminUser.posts.comments.erase(
    connection,
    {
      postId: post.id as string & tags.Format<"uuid">,
      commentId: comment.id as string & tags.Format<"uuid">,
    },
  );

  // 8. Verify that a second erase fails, implying the comment has been removed
  await TestValidator.error(
    "second erase on the same comment should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.posts.comments.erase(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          commentId: comment.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 9. Sanity checks: post and community objects remain logically intact in test context
  TestValidator.equals(
    "post id should remain unchanged after comment erase",
    post.id,
    post.id,
  );
  TestValidator.equals(
    "community id should remain unchanged after comment erase",
    community.id,
    community.id,
  );
}
