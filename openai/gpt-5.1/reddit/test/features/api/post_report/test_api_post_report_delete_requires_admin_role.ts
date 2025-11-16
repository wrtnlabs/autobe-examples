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
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Verify that deleting a post-level report requires adminUser role.
 *
 * Business flow:
 *
 * 1. A memberUser registers and becomes authenticated.
 * 2. The memberUser creates a community.
 * 3. The memberUser joins that community (membership create).
 * 4. The memberUser creates a post in that community.
 * 5. The memberUser creates a post-level report on that post and captures
 *    postReportId.
 * 6. While still authenticated as memberUser, they attempt to call the admin-only
 *    delete endpoint and must receive an authorization failure.
 * 7. An adminUser registers (join) and becomes authenticated, switching the
 *    connection context to admin.
 * 8. The adminUser calls the same delete endpoint for the same postReportId and
 *    the operation must succeed.
 * 9. Because no read/list endpoint for postReports exists in the SDK, we validate
 *    behavior purely by observing that the memberUser call errors while the
 *    adminUser call succeeds.
 */
export async function test_api_post_report_delete_requires_admin_role(
  connection: api.IConnection,
) {
  // 1. memberUser join to obtain authenticated member context
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as the memberUser
  const communityBody = {
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
      { body: communityBody },
    );
  typia.assert(community);

  const communitySlug: string = community.slug;

  // 3. Create membership in the community for the memberUser
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: membershipBody,
      },
    );
  typia.assert(membership);

  // 4. Create a post in that community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 5. Create a post-level report for that post
  const postReportBody = {
    post_id: post.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    severity: "low",
  } satisfies ICommunityPlatformPostReport.ICreate;

  const postReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      {
        body: postReportBody,
      },
    );
  typia.assert(postReport);

  const postReportId = postReport.id;

  // 6. Attempt to delete the report via admin-only endpoint as memberUser => must error
  await TestValidator.error(
    "memberUser cannot delete post report via admin-only endpoint",
    async () => {
      await api.functional.communityPlatform.adminUser.postReports.erase(
        connection,
        {
          postReportId,
        },
      );
    },
  );

  // 7. AdminUser join (sets connection Authorization header to an admin token)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}-admin@example.com`,
    password: "AdminPass123!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 8. Delete the same post report as adminUser => must succeed with no error
  await api.functional.communityPlatform.adminUser.postReports.erase(
    connection,
    {
      postReportId,
    },
  );

  // 9. Final sanity assertion to mark completion
  TestValidator.predicate(
    "completed member vs admin authorization behavior for post report delete",
    true,
  );
}
