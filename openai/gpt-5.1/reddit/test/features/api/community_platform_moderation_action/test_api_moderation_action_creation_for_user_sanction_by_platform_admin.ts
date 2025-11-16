import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate that a platform administrator can record a user-focused moderation
 * action that represents a sanction decision (for example banning a user) based
 * on an existing report.
 *
 * Business workflow:
 *
 * 1. Create two member users (reported and reporter) via auth.memberUser.join.
 * 2. Authenticate as the reporter and create a report with
 *    communityPlatform.memberUser.reports.create that semantically represents a
 *    user-level report (using only the generic ICommunityPlatformReport.ICreate
 *    fields available in this contract).
 * 3. Register and authenticate a platform administrator via
 *    auth.platformAdmin.join and auth.platformAdmin.login.
 * 4. As the platform admin, create a moderation action with
 *    communityPlatform.platformAdmin.moderationActions.create whose primary
 *    effect is a user-level sanction (target_scope="user", action_type like
 *    "ban_user"), optionally including reason_summary and notes_internal.
 * 5. Assert that the moderation action is created successfully, that it is
 *    actor-attributed to the platform admin, and that its scope and action type
 *    reflect a user-focused sanction. Also verify that community_id is null,
 *    representing a platform-wide or non-community-scoped user action.
 */
export async function test_api_moderation_action_creation_for_user_sanction_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Create reported and reporter member users
  const reportedJoinRequest = {
    username: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphaNumeric(8)}+reported@example.com`,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://community.example.com/join/reported",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const reportedUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: reportedJoinRequest,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(reportedUser);

  const reporterJoinRequest = {
    username: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphaNumeric(8)}+reporter@example.com`,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://community.example.com/join/reporter",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const reporterUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: reporterJoinRequest,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(reporterUser);

  // 2. Authenticate as the reporting member user
  const reporterLoginRequest = {
    identifier: reporterJoinRequest.email,
    password: reporterJoinRequest.password,
    ip: null,
    href: "https://community.example.com/login/reporter",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const reporterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: reporterLoginRequest,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(reporterLogin);

  // 3. Reporter creates a generic report that semantically targets a user
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "high",
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
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

  // 4. Register a platform administrator; this also authenticates as that admin
  const adminJoinRequest = {
    username: RandomGenerator.alphaNumeric(10),
    email: `${RandomGenerator.alphaNumeric(8)}+admin@example.com`,
    password: "Adm1nP@ss!",
    displayName: RandomGenerator.name(2),
    href: "https://community.example.com/admin/join",
    referrer: "https://community.example.com/admin/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const adminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    adminAuthorizedFromJoin,
  );

  // 5. Explicitly log in as the platform admin to exercise login flow
  const adminLoginRequest = {
    identifier: adminJoinRequest.email,
    password: adminJoinRequest.password,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;
  const adminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginRequest,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    adminAuthorizedFromLogin,
  );

  // 6. As platform admin, create a user-focused moderation action that
  // semantically represents a sanction (e.g., banning the reported user).
  // Note: The ICommunityPlatformModerationAction.ICreate DTO does not accept
  // a report_id, so we cannot explicitly bind to the concrete report we
  // created above. The backend should infer the linkage based on its own
  // context; we only validate fields that are present in the response DTO.
  const actionType = "ban_user";
  const targetScope = "user";
  const moderationCreateBody = {
    community_id: null,
    action_type: actionType,
    target_scope: targetScope,
    reason_summary: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 10,
    }),
    notes_internal: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.create(
      connection,
      {
        body: moderationCreateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  // 7. Business and structural assertions
  TestValidator.equals(
    "moderation action type should match requested sanction type",
    moderationAction.action_type,
    actionType,
  );
  TestValidator.equals(
    "moderation action target_scope should be user",
    moderationAction.target_scope,
    targetScope,
  );

  // community_id is modeled as nullable; for a platform-admin user-level
  // sanction we expect it to be null (not scoped to a single community).
  TestValidator.equals(
    "moderation action community_id should be null for platform-level user sanction",
    moderationAction.community_id ?? null,
    null,
  );

  // Actor summary should exist and reflect a platformadmin actor type when
  // the action is executed by a platform administrator.
  TestValidator.predicate(
    "moderation action actor summary should be present",
    moderationAction.actor !== undefined,
  );
  if (moderationAction.actor !== undefined) {
    TestValidator.equals(
      "moderation action actorType should be platformadmin",
      moderationAction.actor.actorType,
      "platformadmin",
    );
  }

  // We cannot assert that community_platform_report_id equals our specific
  // report.id, because the create() contract does not expose a way to bind
  // to that report in ICreate, and the backend may choose the association
  // based on other context. We instead rely on typia.assert above to
  // validate that community_platform_report_id has a valid UUID shape and
  // simply assert that it is non-empty.
  TestValidator.predicate(
    "moderation action should have a non-empty report linkage id",
    moderationAction.community_platform_report_id.length > 0,
  );
}
