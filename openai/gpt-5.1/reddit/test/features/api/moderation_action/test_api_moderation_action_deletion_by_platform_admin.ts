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
 * Validate that a platform administrator can delete an existing moderation
 * action.
 *
 * Business flow implemented in this E2E test:
 *
 * 1. Register a platformAdmin account using /auth/platformAdmin/join.
 * 2. Register a memberUser account using /auth/memberUser/join.
 * 3. Authenticate as the memberUser and create a report using
 *    /communityPlatform/memberUser/reports with a valid
 *    ICommunityPlatformReport.ICreate body.
 * 4. Authenticate as the platformAdmin (using /auth/platformAdmin/login) to ensure
 *    admin context is active for moderation operations.
 * 5. Create a moderation action using
 *    /communityPlatform/platformAdmin/moderationActions with a valid
 *    ICommunityPlatformModerationAction.ICreate payload.
 * 6. Verify that the moderation action is created and has a valid UUID id.
 * 7. Call DELETE
 *    /communityPlatform/platformAdmin/moderationActions/{moderationActionId}
 *    via api.functional.communityPlatform.platformAdmin.moderationActions.erase
 *    using the id from step 6.
 * 8. Assert that the erase call completes without throwing and returns void.
 */
export async function test_api_moderation_action_deletion_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (join implicitly authenticates and sets token)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorizedFromJoin);

  // 2. Register a member user who will file the report
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 3. Log in as the member user (explicitly switch actor context) and create a report
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: memberJoinBody.ip ?? null,
    href: memberJoinBody.href,
    referrer: memberJoinBody.referrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: null,
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

  TestValidator.predicate(
    "created report id should be a non-empty UUID string",
    createdReport.id.length > 0,
  );

  // 4. Log back in as platform admin to perform moderation actions
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: platformAdminJoinBody.ip ?? null,
    href: platformAdminJoinBody.href,
    referrer: platformAdminJoinBody.referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedFromLogin);

  // 5. Create a moderation action as platform admin
  const moderationActionCreateBody = {
    community_id: createdReport.context_community?.id ?? null,
    action_type: "no_action",
    target_scope: "report",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdModerationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.create(
      connection,
      {
        body: moderationActionCreateBody,
      },
    );
  typia.assert(createdModerationAction);

  TestValidator.predicate(
    "created moderation action id should be a non-empty UUID string",
    createdModerationAction.id.length > 0,
  );

  // Business sanity check: ensure action_type and target_scope round-trip
  TestValidator.equals(
    "moderation action type should match request",
    createdModerationAction.action_type,
    moderationActionCreateBody.action_type,
  );
  TestValidator.equals(
    "moderation action target_scope should match request",
    createdModerationAction.target_scope,
    moderationActionCreateBody.target_scope,
  );

  // 6. Delete the moderation action by id using the platformAdmin context
  await api.functional.communityPlatform.platformAdmin.moderationActions.erase(
    connection,
    {
      moderationActionId: createdModerationAction.id,
    },
  );

  // 7. If we reached this point without an exception, deletion succeeded.
  TestValidator.predicate(
    "moderation action deletion completes without throwing",
    true,
  );
}
