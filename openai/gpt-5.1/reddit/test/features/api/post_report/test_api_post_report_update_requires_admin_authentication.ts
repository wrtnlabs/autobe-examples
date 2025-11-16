import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Verify that post report updates require adminUser authentication and are
 * rejected for unauthenticated or memberUser callers.
 *
 * ## Business context
 *
 * Post reports are moderation artifacts stored in
 * community_platform_post_reports and are meant to be curated only by
 * administrative actors (adminUser). The admin-only update endpoint PUT
 * /communityPlatform/adminUser/postReports/{postReportId} must not accept
 * updates from unauthenticated clients or regular member users.
 *
 * This test builds a realistic flow:
 *
 * - A member user joins and authenticates.
 * - That member creates a community.
 * - The same member creates a post in that community.
 * - The member files a post report against that post.
 * - With that real report id, we exercise the admin update endpoint under three
 *   different authentication contexts.
 *
 * ## Steps
 *
 * 1. Create and authenticate a memberUser via POST /auth/memberUser/join.
 * 2. As that memberUser, create a community via POST
 *    /communityPlatform/memberUser/communities.
 * 3. As the same memberUser, create a post in that community via POST
 *    /communityPlatform/memberUser/posts.
 * 4. As the same memberUser, create a post report via POST
 *    /communityPlatform/memberUser/postReports and capture its id.
 * 5. Attempt to call PUT /communityPlatform/adminUser/postReports/{postReportId}
 *    WITHOUT any Authorization header, sending an otherwise valid
 *    ICommunityPlatformPostReport.IUpdate payload that modifies status and
 *    severity. Assert that this call fails.
 * 6. Attempt the same update using the memberUser-authenticated connection,
 *    asserting that authorization also fails for non-admin actors.
 * 7. Join as an adminUser via POST /auth/adminUser/join to obtain an authenticated
 *    admin session on the same connection.
 * 8. As that adminUser, call
 *    api.functional.communityPlatform.adminUser.postReports.update with a
 *    payload updating fields like status and severity. This call should succeed
 *    and return an updated ICommunityPlatformPostReport.
 * 9. Use typia.assert on all DTO responses to guarantee structural correctness and
 *    TestValidator.equals to assert that the successful admin update set the
 *    report’s status and severity to the expected values.
 */
export async function test_api_post_report_update_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. MemberUser joins and authenticates (token automatically attached)
  const memberJoinInput = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberAuthorized);

  // 2. MemberUser creates a community
  const communityCreateInput = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
      { body: communityCreateInput },
    );
  typia.assert(community);

  // 3. MemberUser creates a post in the community
  const postCreateInput = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateInput,
    });
  typia.assert(post);

  // 4. MemberUser files a post report
  const reportCreateInput = {
    post_id: post.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    severity: "low",
  } satisfies ICommunityPlatformPostReport.ICreate;
  const originalReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      { body: reportCreateInput },
    );
  typia.assert(originalReport);

  // Prepare a legitimate update payload admin would try to apply
  const updatePayload = {
    status: "in_review",
    severity: "high",
  } satisfies ICommunityPlatformPostReport.IUpdate;

  // 5. Attempt update WITHOUT authentication (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated client cannot update post report",
    async () => {
      await api.functional.communityPlatform.adminUser.postReports.update(
        unauthenticatedConnection,
        {
          postReportId: originalReport.id,
          body: updatePayload,
        },
      );
    },
  );

  // 6. Attempt update with memberUser token (still not admin)
  // At this point `connection` still holds the memberUser Authorization set by join()
  await TestValidator.error(
    "memberUser cannot call adminUser postReports.update",
    async () => {
      await api.functional.communityPlatform.adminUser.postReports.update(
        connection,
        {
          postReportId: originalReport.id,
          body: updatePayload,
        },
      );
    },
  );

  // 7. Join as an adminUser (this overwrites connection.headers.Authorization)
  const adminJoinInput = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(10)}@admin.example.com`,
    password: RandomGenerator.alphabets(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 8. Perform the update as adminUser and expect success
  const updatedReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.adminUser.postReports.update(
      connection,
      {
        postReportId: originalReport.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedReport);

  // 9. Validate that status and severity match the update payload
  TestValidator.equals(
    "report status should match update payload",
    updatedReport.status,
    updatePayload.status,
  );
  TestValidator.equals(
    "report severity should match update payload",
    updatedReport.severity,
    updatePayload.severity,
  );
}
