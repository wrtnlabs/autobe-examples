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

export async function test_api_moderation_action_creation_by_community_moderator_for_member_report(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user who will submit the report
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. As authenticated memberUser, create a new report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(report);

  // 3. Register a community moderator account (this also authenticates as moderator)
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: moderatorEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://community.example.com/moderator/join",
    referrer: "https://community.example.com/moderator/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorAuthorized,
  );

  // 4. Optionally perform an explicit moderator login to exercise the login endpoint
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorJoinBody.password,
    ip: null,
    href: "https://community.example.com/moderator/login",
    referrer: "https://community.example.com/moderator/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorAuthorizedAfterLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorAuthorizedAfterLogin,
  );

  // 5. As authenticated community moderator, create a moderation action for the report
  const actionType = "remove_content";
  const targetScope = "post";

  const moderationCreateBody = {
    community_id: null,
    action_type: actionType,
    target_scope: targetScope,
    reason_summary: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
    notes_internal: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: moderationCreateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  // 6. Business assertions
  TestValidator.equals(
    "moderation action is linked to the original report",
    moderationAction.community_platform_report_id,
    report.id,
  );

  TestValidator.equals(
    "moderation action_type matches request",
    moderationAction.action_type,
    actionType,
  );

  TestValidator.equals(
    "moderation target_scope matches request",
    moderationAction.target_scope,
    targetScope,
  );

  TestValidator.predicate(
    "moderation action has a non-empty id",
    moderationAction.id.length > 0,
  );

  TestValidator.predicate(
    "moderation action has created_at timestamp",
    moderationAction.created_at.length > 0,
  );

  TestValidator.predicate(
    "moderation action has updated_at timestamp",
    moderationAction.updated_at.length > 0,
  );

  TestValidator.predicate(
    "moderation action actor summary is populated",
    () => moderationAction.actor !== undefined,
  );

  if (moderationAction.actor !== undefined) {
    TestValidator.predicate(
      "moderation action actor has non-empty id",
      moderationAction.actor.id.length > 0,
    );

    TestValidator.predicate(
      "moderation action actor has non-empty actorType",
      moderationAction.actor.actorType.length > 0,
    );
  }
}
