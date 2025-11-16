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
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate creating a moderation action without community context.
 *
 * Business goal: Ensure that when a report is platform-wide or user-level (not
 * bound to a specific community), a community moderator can record a moderation
 * action for that report without specifying a community_id, and that the
 * created moderation action correctly reflects the absence of community context
 * while still linking to the target report and actor.
 *
 * High-level flow:
 *
 * 1. Register a member user and implicitly authenticate them.
 * 2. As that member user, create a report whose community_id is null to represent
 *    a non-community-scoped report (e.g., user-level).
 * 3. Register and login a community moderator actor.
 * 4. As the community moderator, create a moderation action for the previously
 *    created report with:
 *
 *    - Action_type = "ban_user"
 *    - Target_scope = "user"
 *    - Community_id explicitly null.
 * 5. Verify that the moderation action is created successfully, is linked to the
 *    correct report, has null community_id, and contains actor and timestamps.
 */
export async function test_api_moderation_action_creation_without_community_context(
  connection: api.IConnection,
) {
  // 1. Register a member user (self-join) and implicitly authenticate.
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberUsername: string = RandomGenerator.alphabets(12);
  const memberPassword: string = RandomGenerator.alphaNumeric(16);
  const memberJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        ip: null,
        href: memberJoinHref,
        referrer: memberJoinReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberAuthorized);

  // 2. As the authenticated member user, create a platform-wide/user-level report
  //    with no community context (community_id = null).
  const reportReasonCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: reportReasonCategoryId,
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 3. Register a community moderator and implicitly authenticate.
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorUsername: string = RandomGenerator.alphabets(10);
  const moderatorPassword: string = RandomGenerator.alphaNumeric(18);
  const moderatorJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const moderatorJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const moderatorAuthorizedOnJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: null,
        ip: null,
        href: moderatorJoinHref,
        referrer: moderatorJoinReferrer,
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorAuthorizedOnJoin);

  // 4. Explicitly login as the community moderator to ensure the
  //    Authorization header is clearly associated with this actor.
  const moderatorLoginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const moderatorLoginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const moderatorAuthorizedOnLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        identifier: moderatorEmail,
        password: moderatorPassword,
        ip: null,
        href: moderatorLoginHref,
        referrer: moderatorLoginReferrer,
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    });
  typia.assert(moderatorAuthorizedOnLogin);

  // 5. As the authenticated community moderator, create a moderation
  //    action for the report with no community_id.
  const moderationActionCreateBody = {
    community_id: null,
    action_type: "ban_user",
    target_scope: "user",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: moderationActionCreateBody,
      },
    );
  typia.assert(moderationAction);

  // 6. Business validations.
  // 6-1. community_id must be null, verifying no community context.
  TestValidator.equals(
    "moderation action created without community context has null community_id",
    moderationAction.community_id,
    null,
  );

  // 6-2. Moderation action is linked to the correct report.
  TestValidator.equals(
    "moderation action is linked to the correct report",
    moderationAction.community_platform_report_id,
    report.id,
  );

  // 6-3. Actor information should be populated for auditing.
  TestValidator.predicate(
    "moderation action actor is populated",
    moderationAction.actor !== undefined && moderationAction.actor !== null,
  );

  // 6-4. Timestamps should be present (typia.assert already validated
  //      format, so just ensure truthy presence).
  TestValidator.predicate(
    "moderation action has created_at timestamp",
    !!moderationAction.created_at,
  );

  TestValidator.predicate(
    "moderation action has updated_at timestamp",
    !!moderationAction.updated_at,
  );

  // 6-5. Optionally verify that the resolved community context on the
  //      moderation action is null or undefined when community_id is null.
  TestValidator.predicate(
    "moderation action community summary is null or undefined for platform-wide action",
    moderationAction.community === null ||
      moderationAction.community === undefined,
  );
}
