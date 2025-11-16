import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfUsers";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformReportUserReportedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportUserReportedUser";
import type { ICommunityPlatformReportUserReporter } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportUserReporter";
import type { ICommunityPlatformReportUserTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportUserTarget";

/**
 * Validate that the moderator-facing user-focused report view stays in sync
 * with moderation actions taken on a report.
 *
 * Business goal: After a member user submits a report and a community moderator
 * records a moderation action against that report, the user-focused view
 * (ICommunityPlatformReportOfUsers) fetched by the moderator should:
 *
 * - Refer to the correct report (same id as the created report).
 * - Expose a sensible, up-to-date lifecycle status string.
 * - Reflect an updated updatedAt timestamp that is at least as recent as the
 *   original report.updated_at and normally greater.
 * - Preserve consistent reporter and target user context.
 *
 * Steps:
 *
 * 1. Register and implicitly authenticate a member user using
 *    api.functional.auth.memberUser.join.
 * 2. As that member user, create a report via
 *    api.functional.communityPlatform.memberUser.reports.create using a
 *    concrete ICommunityPlatformReport.ICreate body.
 * 3. Register a community moderator via
 *    api.functional.auth.communityModerator.join, then explicitly log in via
 *    api.functional.auth.communityModerator.login to ensure the SDK sets the
 *    Authorization header for moderator operations.
 * 4. As the moderator, create a moderation action for the previously created
 *    report using
 *    api.functional.communityPlatform.communityModerator.reports.moderationActions.create
 *    with an ICommunityPlatformModerationAction.ICreate body.
 * 5. Still as the moderator, fetch the user-focused report projection using
 *    api.functional.communityPlatform.communityModerator.reports.user.at.
 * 6. Validate via typia.assert that the returned DTO matches
 *    ICommunityPlatformReportOfUsers and then assert business-level
 *    invariants:
 *
 *    - Projection id equals the original report.id.
 *    - Projection.status is a non-empty string and, if the domain updates it in
 *         response to the action, can differ from the original report.status.
 *    - Projection.updatedAt is greater than or equal to the original
 *         report.updated_at (and usually strictly greater).
 *    - Reporter.displayName and reporter.actorType are non-empty strings.
 *    - Target.scope and target.id are non-empty strings.
 */
export async function test_api_moderator_view_report_user_context_reflects_moderation_action(
  connection: api.IConnection,
) {
  // 1. Register a member user (join implicitly authenticates the member)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/join/member",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As the member user, create a report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // 3. Register and log in a community moderator to switch actor context
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: "https://example.com/join/moderator",
    referrer: "https://example.com/landing/mod",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // Explicit login to ensure Authorization header is bound to moderator actor
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoggedIn: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoggedIn);

  // 4. As moderator, create a moderation action for the report
  const moderationActionBody = {
    community_id: null,
    action_type: "warn_user",
    target_scope: "user",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
      connection,
      {
        reportId: createdReport.id,
        body: moderationActionBody,
      },
    );
  typia.assert(createdAction);

  // 5. Fetch the user-focused report projection as moderator
  const reportUserView: ICommunityPlatformReportOfUsers =
    await api.functional.communityPlatform.communityModerator.reports.user.at(
      connection,
      {
        reportId: createdReport.id,
      },
    );
  typia.assert(reportUserView);

  // 6. Business-level validations

  // 6-1. The projection must refer to the same report id
  TestValidator.equals(
    "user-focused report view should have same id as created report",
    reportUserView.id,
    createdReport.id,
  );

  // 6-2. Status should be a non-empty string; if changed, still acceptable
  TestValidator.predicate(
    "report user view status should be a non-empty string",
    reportUserView.status.length > 0,
  );

  // If status transitioned as part of moderation, it's fine; at minimum, we
  // can assert that status remains a valid non-empty string. Optionally, check
  // for change when domain behavior supports it without being brittle.

  // 6-3. updatedAt should not be earlier than the original updated_at
  TestValidator.predicate(
    "report user view updatedAt should be >= original report.updated_at",
    new Date(reportUserView.updatedAt).getTime() >=
      new Date(createdReport.updated_at).getTime(),
  );

  // 6-4. Reporter context should be present and have non-empty fields
  TestValidator.predicate(
    "reporter.displayName should be non-empty",
    reportUserView.reporter.displayName.length > 0,
  );
  TestValidator.predicate(
    "reporter.actorType should be non-empty",
    reportUserView.reporter.actorType.length > 0,
  );

  // 6-5. Target context should be present and non-empty
  TestValidator.predicate(
    "report target.scope should be non-empty",
    reportUserView.target.scope.length > 0,
  );
  TestValidator.predicate(
    "report target.id should be non-empty",
    reportUserView.target.id.length > 0,
  );
}
