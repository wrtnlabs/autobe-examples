import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
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
 * Complex moderation workflow for updating a post report with admin ownership,
 * status/severity change, and moderation case linkage while preserving
 * immutable fields.
 *
 * Business flow (happy path focus, no type-error tests):
 *
 * 1. Member user registration and authentication
 *
 *    - Call POST /auth/memberUser/join with ICommunityPlatformMemberuser.IJoin to
 *         create a member account and receive
 *         ICommunityPlatformMemberuser.IAuthorized plus token. Use realistic
 *         data for username/email/password and href/referrer. SDK automatically
 *         installs the Authorization header on the connection.
 * 2. Community creation as member
 *
 *    - Using the member-authenticated connection, call POST
 *         /communityPlatform/memberUser/communities with
 *         ICommunityPlatformCommunity.ICreate to create a community.
 *    - Use a random slug and name, set reasonable boolean flags (NSFW=false, posting
 *         not restricted, allow all post types), and visibility/status like
 *         "public"/"active".
 *    - Assert the returned ICommunityPlatformCommunity and keep its id and slug for
 *         the post.
 * 3. Post creation within the community
 *
 *    - Using the same member session, call POST /communityPlatform/memberUser/posts
 *         with ICommunityPlatformPost.ICreate.
 *    - Provide both communityId (uuid from community.id) and communityCode (slug),
 *         plus title/body and a postType (e.g., "text").
 *    - Assert the returned ICommunityPlatformPost and keep its id.
 * 4. Post report creation by the member
 *
 *    - Using the member session, call POST /communityPlatform/memberUser/postReports
 *         with ICommunityPlatformPostReport.ICreate.
 *    - Set post_id to the post.id and choose a reason_category like "spam" and
 *         severity like "medium"; optionally set a reason_detail.
 *    - Assert the returned ICommunityPlatformPostReport and keep its id and the
 *         original reason/status/severity and associated post/reporters.
 * 5. Admin user registration and authentication
 *
 *    - Switch to an unauthenticated/basic connection clone and call POST
 *         /auth/adminUser/join with ICommunityPlatformAdminUserJoin.IRequest to
 *         create an admin. Use realistic username/email/password. SDK will
 *         again apply the admin token to the connection.
 *    - Optionally, you could also exercise POST /auth/adminUser/login, but join
 *         already produces an authorized context; for simplicity, rely on join
 *         to be logged in as that admin for subsequent calls.
 * 6. Create a generic account restriction episode (admin context)
 *
 *    - Using the admin-authenticated connection, call POST
 *         /communityPlatform/adminUser/accountRestrictions with
 *         ICommunityPlatformAccountRestriction.ICreate.
 *    - Choose account_type such as "admin", scope like "login" or "full",
 *         reason_category such as "security" and a reason_detail, and set a
 *         starts_at (now) and ends_at (sometime in the future as an ISO
 *         string).
 *    - Assert the returned ICommunityPlatformAccountRestriction to ensure it has an
 *         id, correct fields, and created_at/updated_at.
 * 7. Create an admin-user-specific account restriction linkage
 *
 *    - Using the same admin context, call POST
 *         /communityPlatform/adminUser/adminUsers/{username}/accountRestrictions
 *         with the admin's username path parameter and another
 *         ICommunityPlatformAccountRestriction.ICreate body (can differ from
 *         the generic episode or re-use similar values).
 *    - Assert the returned restriction object; it should have adminUserRestriction
 *         populated, and the nested adminUser summary should match the acting
 *         admin's identity.
 * 8. Open a moderation case (optional but exercised in this scenario)
 *
 *    - Still under the admin session, call POST
 *         /communityPlatform/adminUser/moderationCases with
 *         ICommunityPlatformModerationCase.ICreate.
 *    - Use a random case_key and title, some description, an initial status like
 *         "open", and a priority like "high". For assigned_adminuser_id, you
 *         may assign the case to the acting admin using their id from
 *         ICommunityPlatformAdminuser.IAuthorized.
 *    - Assert the returned ICommunityPlatformModerationCase and keep its id.
 * 9. Update the post report as admin
 *
 *    - Using the admin-authenticated connection, call PUT
 *         /communityPlatform/adminUser/postReports/{postReportId} via
 *         api.functional.communityPlatform.adminUser.postReports.update.
 *    - Use postReportId from the member-created report.
 *    - The ICommunityPlatformPostReport.IUpdate body should:
 *
 *         - Set status to a resolved-like value (e.g., "resolved").
 *         - Update severity to a different level (e.g., from "medium" to "high").
 *         - Set moderation_case_id to the moderation case id created in step 8.
 *         - Set assigned_adminuser_id to the acting admin's id, to claim the report. Do
 *                   not change post_id or reason_category/reason_detail in this
 *                   scenario to keep focus on workflow fields.
 *    - Assert the returned ICommunityPlatformPostReport.
 * 10. Validate updated report invariants & relations
 *
 * - Use typia.assert on all intermediate entities and the final report.
 * - Using TestValidator:
 *
 *   - Confirm the updated report id equals the original report id.
 *   - Confirm the post summary (if present) still has the same id as the original
 *       post.
 *   - Confirm reporterMember (if present) still has the same id as the original
 *       reporting member.
 *   - Confirm status has changed to the desired resolved value and severity
 *       reflects the new value.
 *   - Confirm moderationCase (if present) has the moderation case id used in the
 *       update.
 *   - Confirm assignedAdmin (if present) reflects the acting admin (compare
 *       username/displayName/id as available in summaries).
 *   - Confirm updated_at on the report is >= the original updated_at observed from
 *       the creation response.
 * - This test does not attempt to dereference or re-fetch the restriction
 *   episodes; instead, it validates that restriction creation APIs succeed in
 *   the same admin context used to update the report, establishing a plausible
 *   enforcement backdrop for the report resolution.
 */
export async function test_api_post_report_update_by_admin_assign_and_change_status_with_admin_account_restriction_context(
  connection: api.IConnection,
) {
  // 1. Member user registration and authentication
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    ip: null,
    href: "https://frontend.example.com/signup",
    referrer: "https://frontend.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  const memberId = memberAuth.id;

  // 2. Community creation as member
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

  // 3. Post creation within the community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4. Post report creation by the member
  const initialSeverity = "medium";
  const reportCreateBody = {
    post_id: post.id,
    reason_category: "spam",
    reason_detail: "Looks like automated advertising content.",
    severity: initialSeverity,
  } satisfies ICommunityPlatformPostReport.ICreate;

  const createdReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(createdReport);

  const originalReportId = createdReport.id;
  const originalUpdatedAt = createdReport.updated_at;
  const originalPostId = createdReport.post?.id;
  const originalReporterId = createdReport.reporterMember?.id;

  // 5. Admin user registration and authentication
  const adminJoinBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Adm1nP@ss!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuth: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  const adminId = adminAuth.id;
  const adminUsername = adminAuth.username;

  // 6. Create a generic account restriction episode (admin context)
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const genericRestrictionBody = {
    account_type: "admin",
    scope: "login",
    reason_category: "security",
    reason_detail: "Generic security hardening for admin accounts",
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const genericRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: genericRestrictionBody },
    );
  typia.assert(genericRestriction);

  // 7. Create an admin-user-specific account restriction linkage
  const adminSpecificRestrictionBody = {
    account_type: "admin",
    scope: "full",
    reason_category: "enforcement_context",
    reason_detail: "Restriction episode associated with moderation actions",
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const adminSpecificRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create(
      connection,
      {
        username: adminUsername,
        body: adminSpecificRestrictionBody,
      },
    );
  typia.assert(adminSpecificRestriction);

  // Optionally validate that adminUserRestriction is present when provided
  if (adminSpecificRestriction.adminUserRestriction?.adminUser) {
    TestValidator.equals(
      "admin-specific restriction adminUser id should match acting admin",
      adminSpecificRestriction.adminUserRestriction.adminUser.id,
      adminId,
    );
  }

  // 8. Open a moderation case
  const moderationCaseBody = {
    case_key: `CASE-${RandomGenerator.alphaNumeric(8)}`,
    title: "Post spam triage",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: adminId,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: moderationCaseBody },
    );
  typia.assert(moderationCase);

  const moderationCaseId = moderationCase.id;

  // 9. Update the post report as admin
  const resolvedStatus = "resolved";
  const finalSeverity = "high";

  const reportUpdateBody = {
    status: resolvedStatus,
    severity: finalSeverity,
    moderation_case_id: moderationCaseId,
    assigned_adminuser_id: adminId,
  } satisfies ICommunityPlatformPostReport.IUpdate;

  const updatedReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.adminUser.postReports.update(
      connection,
      {
        postReportId: createdReport.id,
        body: reportUpdateBody,
      },
    );
  typia.assert(updatedReport);

  // 10. Validate updated report invariants & relations
  TestValidator.equals(
    "post report id should be stable across update",
    updatedReport.id,
    originalReportId,
  );

  if (originalPostId !== undefined) {
    TestValidator.equals(
      "reported post id should remain unchanged",
      updatedReport.post?.id,
      originalPostId,
    );
  }

  if (originalReporterId !== undefined) {
    TestValidator.equals(
      "reporter member id should remain unchanged",
      updatedReport.reporterMember?.id,
      originalReporterId,
    );
  }

  TestValidator.equals(
    "report status should be updated to resolved",
    updatedReport.status,
    resolvedStatus,
  );

  TestValidator.equals(
    "report severity should be updated to final value",
    updatedReport.severity,
    finalSeverity,
  );

  if (updatedReport.moderationCase) {
    TestValidator.equals(
      "report moderation case id should match opened case",
      updatedReport.moderationCase.id,
      moderationCaseId,
    );
  }

  if (updatedReport.assignedAdmin) {
    TestValidator.equals(
      "assigned admin id on report should match acting admin",
      updatedReport.assignedAdmin.id,
      adminId,
    );
  }

  TestValidator.predicate(
    "updated_at should be >= original updated_at on report",
    new Date(updatedReport.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
}
