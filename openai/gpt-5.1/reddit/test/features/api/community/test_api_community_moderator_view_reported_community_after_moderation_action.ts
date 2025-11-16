import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportOfCommunities } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfCommunities";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Verify that a community moderator can still view the reported community
 * context after a moderation action has been recorded for a report.
 *
 * Business flow implemented with available APIs:
 *
 * 1. Register a member user (auth.memberUser.join) to act as the reporter.
 * 2. As that member user, create a top-level report
 *    (communityPlatform.memberUser.reports.create) with a synthetic but
 *    structurally valid reason category id and community id.
 * 3. Register a community moderator (auth.communityModerator.join) who will handle
 *    the report.
 * 4. As the community moderator, create a moderation action for the report
 *    (communityPlatform.communityModerator.reports.moderationActions.create),
 *    tying it to the same community id and using a concrete action_type and
 *    target_scope.
 * 5. Still as the moderator, call the reported-community endpoint
 *    (communityPlatform.communityModerator.reports.community.at) using the same
 *    report id.
 *
 * Validations performed:
 *
 * - All API responses are structurally valid via typia.assert.
 * - The report id used across creation, moderation action, and community lookup
 *   is consistent.
 * - The reported-community call succeeds and returns a linked community wrapper
 *   object.
 * - The resolved community id from the reported-community DTO matches the
 *   community_id used in the original report creation, confirming linkage.
 * - The existence of a moderation action does not prevent retrieval of the
 *   community context.
 */
export async function test_api_community_moderator_view_reported_community_after_moderation_action(
  connection: api.IConnection,
) {
  // 1. Register a member user who will submit the report
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As the member user, create a report with a community context
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const reasonCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: reasonCategoryId,
    community_id: communityId,
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

  // 3. Register a community moderator who will act on the report
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://community.example.com/moderator/signup",
    referrer: "https://community.example.com/moderator/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 4. As the community moderator, record a moderation action on the report
  const moderationCreateBody = {
    community_id: communityId,
    action_type: "no_action",
    target_scope: "community",
    reason_summary: "Initial triage completed, no immediate action taken.",
    notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
      connection,
      {
        reportId: createdReport.id,
        body: moderationCreateBody,
      },
    );
  typia.assert(moderationAction);

  TestValidator.equals(
    "moderation action should reference the same report id",
    moderationAction.community_platform_report_id,
    createdReport.id,
  );

  // 5. Retrieve the reported community context via the moderator endpoint
  const reportedCommunity: ICommunityPlatformReportOfCommunities =
    await api.functional.communityPlatform.communityModerator.reports.community.at(
      connection,
      {
        reportId: createdReport.id,
      },
    );
  typia.assert(reportedCommunity);

  // Confirm the reported community entity is present
  TestValidator.predicate(
    "reported community entity should be present",
    reportedCommunity.community.id !== undefined &&
      reportedCommunity.community.id !== null,
  );

  // Verify that the resolved community id matches the one used when creating the report
  TestValidator.equals(
    "reported community id should match community_id used in report creation",
    reportedCommunity.community.id,
    communityId,
  );
}
