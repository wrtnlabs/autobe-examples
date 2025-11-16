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
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Validate update rules for community post reports via adminUser.
 *
 * This scenario ensures that the admin-only endpoint PUT
 * /communityPlatform/adminUser/postReports/{postReportId} enforces existence
 * checks, foreign key integrity for moderation cases, and keeps core
 * identifiers stable while allowing permitted status and severity changes.
 *
 * Business workflow covered:
 *
 * 1. A memberUser joins, creates a community and a post, and files an initial post
 *    report against that post.
 * 2. An adminUser joins (and is implicitly authenticated) to act as the moderation
 *    actor.
 * 3. The admin attempts to update a non-existent report id and the system must
 *    reject it.
 * 4. The admin creates a real moderation case then attempts to update the real
 *    report with an invalid moderation_case_id; the system must reject this
 *    invalid reference.
 * 5. The admin finally performs a valid update referencing the real moderation
 *    case and adjusting workflow fields; the system must accept the update,
 *    preserve immutable ids, and reflect the new values on mutable fields.
 */
export async function test_api_post_report_update_validates_existing_report_and_modification_rules(
  connection: api.IConnection,
) {
  // 1. Member joins
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  // 2. Member creates a community
  const communityCreateBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}`,
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Member creates a post inside the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 4. Member creates a post report for this post
  const reportCreateBody = {
    post_id: post.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    severity: "medium",
  } satisfies ICommunityPlatformPostReport.ICreate;
  const report: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(report);

  // 5. Admin joins (and becomes authenticated adminUser)
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 6. Negative A: attempt to update non-existent postReportId
  const nonExistentPostReportId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "updating non-existent postReport should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.postReports.update(
        connection,
        {
          postReportId: nonExistentPostReportId,
          body: {
            status: "resolved",
          } satisfies ICommunityPlatformPostReport.IUpdate,
        },
      );
    },
  );

  // 7. Admin creates a moderation case
  const moderationCaseCreateBody = {
    case_key: `CASE-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "open",
    priority: "medium",
    assigned_adminuser_id: adminAuthorized.id,
  } satisfies ICommunityPlatformModerationCase.ICreate;
  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: moderationCaseCreateBody },
    );
  typia.assert(moderationCase);

  // 8. Negative B: invalid moderation_case_id association
  const invalidModerationCaseId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update with invalid moderation_case_id should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.postReports.update(
        connection,
        {
          postReportId: report.id,
          body: {
            moderation_case_id: invalidModerationCaseId,
            status: "in_review",
            severity: "high",
          } satisfies ICommunityPlatformPostReport.IUpdate,
        },
      );
    },
  );

  // 9. Positive: valid update referencing existing moderation case
  const validUpdateBody = {
    moderation_case_id: moderationCase.id,
    assigned_adminuser_id: adminAuthorized.id,
    status: "in_review",
    severity: "high",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformPostReport.IUpdate;
  const updated: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.adminUser.postReports.update(
      connection,
      {
        postReportId: report.id,
        body: validUpdateBody,
      },
    );
  typia.assert(updated);

  // 10. Validate identifiers and mutable fields
  TestValidator.equals(
    "report id should remain immutable across update",
    updated.id,
    report.id,
  );

  // Ensure key workflow fields reflect new values
  TestValidator.equals(
    "report status updated to in_review",
    updated.status,
    validUpdateBody.status,
  );
  TestValidator.equals(
    "report severity updated to high",
    updated.severity,
    validUpdateBody.severity,
  );

  // We expect the report still to be associated with the same logical post
  if (updated.post !== undefined) {
    TestValidator.equals(
      "updated report remains linked to original post",
      updated.post.id,
      post.id,
    );
  }

  // If moderationCase summary is present, verify linkage
  if (updated.moderationCase !== undefined && updated.moderationCase !== null) {
    TestValidator.equals(
      "updated report references the created moderation case",
      updated.moderationCase.id,
      moderationCase.id,
    );
  }
}
