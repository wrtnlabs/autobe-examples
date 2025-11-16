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
 * Validate that admin hard-delete for comments enforces (postId, commentId)
 * pairing.
 *
 * Business goal:
 *
 * - When an admin erases a comment, the API must ensure that the given comment
 *   actually belongs to the given post.
 * - If an admin supplies a postId that does not own the commentId, the operation
 *   must behave like a not-found style error and must not delete the target
 *   comment from its real post.
 *
 * Workflow validated by this test:
 *
 * 1. Register a member user and get an authenticated member session.
 * 2. As that member, create a community and join it.
 * 3. In that community, create two posts: post A and post B.
 * 4. Under post A, create a single comment (commentFromPostA).
 * 5. Register an admin user and authenticate as the admin.
 * 6. As the admin, attempt to erase commentFromPostA using the postId from post B
 *    and the commentId belonging to post A. This should fail by throwing an
 *    error, because the comment does not belong to post B.
 * 7. Then, as the admin, call erase again using the correct (postIdA,
 *    commentIdFromPostA) pair. This time the deletion should succeed.
 *
 * Assertions:
 *
 * - The mixed-ID erase call (postB.id + commentFromPostA.id) must fail by
 *   throwing some error, which we validate via TestValidator.error without
 *   checking specific HTTP status codes.
 * - The correct-ID erase call (postA.id + commentFromPostA.id) must succeed
 *   without throwing.
 * - We also assert structural correctness of all created entities using
 *   typia.assert and simple relationship predicates (e.g., comment.post.id ===
 *   postA.id).
 */
export async function test_api_admin_comment_hard_delete_on_comment_from_different_post(
  connection: api.IConnection,
) {
  // 1. Register a member user (join) to get an authenticated member session.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as the member user.
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

  // 3. Join that community via membership create.
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

  // 4. Create two posts (post A and post B) in the community.
  const postACreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 5 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postA: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postACreateBody,
    });
  typia.assert(postA);

  const postBCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 3 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postB: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBCreateBody,
    });
  typia.assert(postB);

  // Sanity check: both posts belong to same community.
  TestValidator.equals(
    "post A community_id matches created community",
    postA.community_id,
    community.id,
  );
  TestValidator.equals(
    "post B community_id matches created community",
    postB.community_id,
    community.id,
  );

  // 5. Create a comment under post A.
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const commentFromPostA: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postA.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert(commentFromPostA);

  // Ensure the comment's embedded post summary refers back to post A.
  TestValidator.equals(
    "comment's post summary id matches post A id",
    commentFromPostA.post.id,
    postA.id,
  );

  // 6. Register an admin user (join) to get an authenticated admin session.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 7. As the admin, attempt to erase the comment using post B's id
  //    with commentFromPostA.id — this must fail (some error must be thrown).
  await TestValidator.error(
    "admin erase with mismatched postId and commentId should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.posts.comments.erase(
        connection,
        {
          postId: postB.id as string & tags.Format<"uuid">,
          commentId: commentFromPostA.id,
        },
      );
    },
  );

  // 8. As the admin, erase with the correct (postA.id, commentFromPostA.id)
  //    pair — this should succeed without throwing.
  await api.functional.communityPlatform.adminUser.posts.comments.erase(
    connection,
    {
      postId: postA.id as string & tags.Format<"uuid">,
      commentId: commentFromPostA.id,
    },
  );
}
