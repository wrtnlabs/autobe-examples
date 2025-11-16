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
 * Ensure non-admin and unauthenticated callers cannot delete comment reports.
 *
 * Business goal
 *
 * - Only adminUser actors must be able to delete comment reports using DELETE
 *   /communityPlatform/adminUser/commentReports/{commentReportId}.
 * - Member users (even the original reporter) and anonymous callers must be
 *   forbidden from erasing moderation artifacts.
 *
 * Steps
 *
 * 1. Join as a memberUser (registration implicitly authenticates and sets token).
 * 2. As the memberUser, create a community.
 * 3. As the same memberUser, join that community by slug.
 * 4. As the memberUser, create a post in that community.
 * 5. As the memberUser, create a comment under the post.
 * 6. As the memberUser, create a comment report referencing that comment and
 *    capture the report id.
 * 7. While still authenticated as memberUser (non-admin), call the admin-only
 *    DELETE /communityPlatform/adminUser/commentReports/{commentReportId} and
 *    expect an authorization error.
 * 8. Create an unauthenticated connection clone and attempt the same DELETE,
 *    expecting an authentication error.
 * 9. Join/login as an adminUser and successfully delete the report to prove that
 *    the endpoint works for admins and that previous failed attempts did not
 *    remove the report.
 */
export async function test_api_comment_report_delete_rejects_non_admin_caller(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user (token automatically attached)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As memberUser, create a community
  const communityCreateBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({ sentences: 5 }) as string &
      tags.MaxLength<4000>,
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

  // 3. As memberUser, join the community
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
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

  // 4. As memberUser, create a post in the community
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

  // 5. As memberUser, create a comment under the post
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

  // 6. As memberUser, create a comment report
  const reportCreateBody = {
    comment_id: comment.id,
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommentReport.ICreate;

  const report: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.memberUser.commentReports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 7. As memberUser (non-admin), attempt to delete via admin endpoint
  await TestValidator.httpError(
    "memberUser cannot delete comment report via admin endpoint",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.adminUser.commentReports.erase(
        connection,
        {
          commentReportId: report.id,
        },
      );
    },
  );

  // 8. As unauthenticated caller, attempt the same DELETE
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "unauthenticated caller cannot delete comment report via admin endpoint",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.adminUser.commentReports.erase(
        unauthenticated,
        {
          commentReportId: report.id,
        },
      );
    },
  );

  // 9. Join as an adminUser and delete successfully to prove admin access works
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphaNumeric(8)}`,
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // After admin join, connection carries admin Authorization header by SDK,
  // so DELETE should now succeed without error.
  await api.functional.communityPlatform.adminUser.commentReports.erase(
    connection,
    {
      commentReportId: report.id,
    },
  );
}
