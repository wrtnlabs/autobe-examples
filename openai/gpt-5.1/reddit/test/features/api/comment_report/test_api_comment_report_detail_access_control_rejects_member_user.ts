import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Verify that a memberUser cannot access admin-only comment report details.
 *
 * Business purpose:
 *
 * - Member users are allowed to file comment reports, but the detailed moderation
 *   view of those reports is reserved for adminUser actors.
 * - Even if the memberUser is the original reporter, they must not be able to
 *   call the admin-only detail endpoint.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate a memberUser via /auth/memberUser/join.
 * 2. As that memberUser, create a community.
 * 3. Join the created community as a member.
 * 4. Create a post in the community.
 * 5. Add a comment to the post.
 * 6. File a comment report against that comment.
 * 7. While still authenticated as the memberUser, attempt to fetch the report
 *    details via the admin-only endpoint GET
 *    /communityPlatform/adminUser/commentReports/{commentReportId}.
 *
 * Expectations:
 *
 * - All setup operations (join, community create, membership create, post create,
 *   comment create, comment report create) succeed and return well-typed DTOs.
 * - The admin-only detail call fails when executed under a memberUser session; we
 *   assert this using TestValidator.error without checking specific HTTP status
 *   codes.
 */
export async function test_api_comment_report_detail_access_control_rejects_member_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser
  const memberJoinInput = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as this memberUser
  const communityCreateInput = {
    slug: `community-${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateInput,
      },
    );
  typia.assert(community);

  // 3. Join the created community as a member
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

  // 4. Create a post in that community
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

  // 5. Create a comment on the post
  const commentCreateInput = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateInput,
      },
    );
  typia.assert(comment);

  // 6. File a comment report as the same memberUser
  const commentReportCreateInput = {
    comment_id: comment.id,
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommentReport.ICreate;

  const createdReport: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.memberUser.commentReports.create(
      connection,
      {
        body: commentReportCreateInput,
      },
    );
  typia.assert(createdReport);

  // 7. Attempt to access admin-only comment report detail with memberUser token
  await TestValidator.error(
    "memberUser cannot access admin-only comment report detail",
    async () => {
      await api.functional.communityPlatform.adminUser.commentReports.at(
        connection,
        {
          commentReportId: createdReport.id,
        },
      );
    },
  );
}
