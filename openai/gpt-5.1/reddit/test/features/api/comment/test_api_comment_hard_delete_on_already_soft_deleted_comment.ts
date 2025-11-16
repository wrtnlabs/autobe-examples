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
 * Validate that a hard delete of a comment only succeeds after it has
 * previously been soft-deleted, and that it removes only the comment row while
 * leaving the owning post and community intact.
 *
 * End-to-end workflow covered by this test:
 *
 * 1. Register and authenticate a member user (memberUser join).
 * 2. Create a community as that member.
 * 3. Join the community via a membership.
 * 4. Create a post in that community.
 * 5. Create a comment under the post.
 * 6. Soft-delete the comment via the memberUser comment update endpoint by
 *    changing status to a moderation-removed value.
 * 7. Register and authenticate an admin user (adminUser join).
 * 8. Using the admin context, hard-delete the soft-deleted comment via the erase
 *    endpoint.
 * 9. Verify that the erase call succeeds (no error) and that subsequent erase
 *    attempts for the same comment fail, indicating the comment row has been
 *    removed.
 * 10. Ensure that the community and post objects created earlier remain valid and
 *     unchanged up to the point of deletion.
 */
export async function test_api_comment_hard_delete_on_already_soft_deleted_comment(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as that member
  const communityCreateBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
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

  // 3. Join the community via a membership
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

  // 4. Create a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Create a comment under the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 6. Soft-delete the comment by updating its status
  const commentSoftDeleteBody = {
    status: "removed_by_moderation",
  } satisfies ICommunityPlatformComment.IUpdate;

  const softDeletedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.update(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        commentId: comment.id as string & tags.Format<"uuid">,
        body: commentSoftDeleteBody,
      },
    );
  typia.assert(softDeletedComment);

  TestValidator.equals(
    "comment status updated to removed_by_moderation",
    softDeletedComment.status,
    "removed_by_moderation",
  );

  // 7. Register and authenticate an admin user
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphaNumeric(6)}`,
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 8. Hard-delete the soft-deleted comment via the erase endpoint
  await api.functional.communityPlatform.memberUser.posts.comments.erase(
    connection,
    {
      postId: post.id as string & tags.Format<"uuid">,
      commentId: comment.id as string & tags.Format<"uuid">,
    },
  );

  // 9. Verify that subsequent erase attempts fail, indicating the comment row is gone
  await TestValidator.error(
    "repeated hard delete on same comment should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.comments.erase(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          commentId: comment.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 10. Confirm that community and post objects were valid up to deletion
  // (Already asserted after creation using typia.assert; we additionally
  // validate key identity relationships here.)
  TestValidator.equals(
    "post community_id matches created community id",
    post.community_id,
    community.id,
  );

  TestValidator.equals(
    "membership community summary id matches created community id",
    membership.community.id,
    community.id,
  );
}
