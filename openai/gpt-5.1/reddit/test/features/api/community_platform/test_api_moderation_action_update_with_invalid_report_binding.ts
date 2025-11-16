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
 * Validate that a moderation action cannot be updated using a mismatched
 * reportId.
 *
 * Business goal: Ensure that the update endpoint for moderation actions
 * enforces the invariant that
 * `community_platform_moderation_actions.community_platform_report_id` must
 * match the `reportId` path parameter. If a client attempts to update a
 * moderation action while specifying a different parent report in the URL, the
 * API must reject the operation and not rebind the moderation action.
 *
 * End-to-end workflow covered:
 *
 * 1. Platform admin self-registers to obtain an authenticated admin context.
 * 2. Member user self-registers and becomes authenticated.
 * 3. As the member user, create two distinct reports (Report A and Report B).
 * 4. Switch back to the platform admin account.
 * 5. Create a moderation action bound to Report A.
 * 6. Attempt to update that moderation action using Report B's id in the
 *    `reportId` path parameter, causing a mismatch between the path and the
 *    moderation action's bound report id.
 * 7. Assert that the update call fails, proving that the backend does not allow
 *    cross-report binding updates.
 */
export async function test_api_moderation_action_update_with_invalid_report_binding(
  connection: api.IConnection,
) {
  // 1. Platform admin self-registers to obtain an authenticated admin context.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminP@ssw0rd",
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Member user self-registers and becomes authenticated.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.example.com`,
    password: "MemberP@ssw0rd",
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As the member user, create two distinct reports (Report A and Report B).
  const reportCreateBase = (): ICommunityPlatformReport.ICreate => ({
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  });

  const reportA: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBase(),
      },
    );
  typia.assert(reportA);

  const reportB: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBase(),
      },
    );
  typia.assert(reportB);

  await TestValidator.predicate(
    "report A and B must be different",
    async () => reportA.id !== reportB.id,
  );

  // 4. Switch back to the platform admin account using login API.
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 5. Create a moderation action bound to Report A.
  const moderationCreateBody = {
    community_id: null,
    action_type: "warn_user",
    target_scope: "user",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: reportA.id,
        body: moderationCreateBody,
      },
    );
  typia.assert(moderationAction);

  TestValidator.equals(
    "created moderation action must be bound to report A",
    moderationAction.community_platform_report_id,
    reportA.id,
  );

  // 6. Attempt to update that moderation action using Report B's id in path.
  const invalidUpdateBody = {
    action_type: "restrict_user",
    target_scope: "user",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  await TestValidator.error(
    "updating moderation action with mismatched reportId should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.moderationActions.update(
        connection,
        {
          reportId: reportB.id,
          moderationActionId: moderationAction.id,
          body: invalidUpdateBody,
        },
      );
    },
  );

  // 7. Sanity check: original moderation action structure remains valid.
  // We cannot re-fetch by id with provided APIs, but we can assert the original
  // object has not changed locally and remains associated with report A.
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);
  TestValidator.equals(
    "moderation action remains associated with report A in local reference",
    moderationAction.community_platform_report_id,
    reportA.id,
  );
}
