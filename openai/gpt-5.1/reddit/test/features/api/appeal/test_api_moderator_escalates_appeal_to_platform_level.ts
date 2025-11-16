import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Community moderator escalates a member appeal to platform-level review.
 *
 * This test exercises the full workflow around appeals and moderator-driven
 * escalation:
 *
 * 1. A member user self-registers and implicitly becomes authenticated.
 * 2. The member submits a moderation report using the memberUser reports endpoint
 *    with a minimal but valid ICommunityPlatformReport.ICreate payload.
 * 3. The same member submits an appeal via the memberUser appeals endpoint, using
 *    ICommunityPlatformAppeal.ICreate (appeal_scope, reason_summary, and
 *    details).
 * 4. A community moderator account is created via join and then logged in so that
 *    the connection carries moderator Authorization.
 * 5. Using that moderator context, the test calls the moderator appeals update
 *    endpoint with the appealId from step 3 and a body of
 *    ICommunityPlatformAppeal.IUpdate that:
 *
 *    - Changes appeal_status to an escalation status such as "escalated",
 *    - Appends or overwrites narrative fields (details or outcome_summary) with
 *         moderator notes,
 *    - Omits resolved_at so that it remains null (no final decision yet).
 * 6. The updated appeal is asserted to:
 *
 *    - Have appeal_status equal to the escalation value,
 *    - Keep resolved_at as null,
 *    - Retain all association references (report, moderationAction, userSanction,
 *         appellantMemberUser) unchanged,
 *    - Have an updated_at timestamp greater than the original updated_at.
 * 7. Additionally, the test validates authorization boundaries by confirming that
 *    a regular member user (or unauthenticated connection) cannot call the
 *    moderator update endpoint for the same appealId.
 */
export async function test_api_moderator_escalates_appeal_to_platform_level(
  connection: api.IConnection,
) {
  // Step 1: memberUser joins and becomes authenticated
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Step 2: memberUser creates a report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // Step 3: memberUser creates an appeal
  const appealCreateBody = {
    appeal_scope: "sanction",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const originalAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealCreateBody,
      },
    );
  typia.assert(originalAppeal);

  // Snapshot of original appeal for comparison
  const originalAppealId = originalAppeal.id;
  const originalStatus = originalAppeal.appeal_status;
  const originalResolvedAt = originalAppeal.resolved_at ?? null;
  const originalUpdatedAt = originalAppeal.updated_at;
  const originalReportId = originalAppeal.report.id;
  const originalModerationActionId = originalAppeal.moderationAction?.id;
  const originalUserSanctionId = originalAppeal.userSanction?.id;
  const originalAppellantId = originalAppeal.appellantMemberUser?.id;

  // Step 3.a: Negative authorization check – member should not be able
  // to call moderator update endpoint (using same connection currently
  // authenticated as member).
  await TestValidator.error(
    "member user cannot call moderator appeal update endpoint",
    async () => {
      await api.functional.communityPlatform.communityModerator.appeals.update(
        connection,
        {
          appealId: originalAppealId as string & tags.Format<"uuid">,
          body: {
            appeal_status: "escalated",
          } satisfies ICommunityPlatformAppeal.IUpdate,
        },
      );
    },
  );

  // Step 4: create and authenticate a community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://client.example.com/moderator/join",
    referrer: "https://client.example.com/moderator/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // Explicit moderator login to ensure Authorization header reflects moderator
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: "https://client.example.com/moderator/console",
    referrer: "https://client.example.com/moderator/login",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginResult: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginResult);

  // Step 5: moderator escalates the appeal via update endpoint
  const escalationStatus = "escalated";
  const moderatorNote = RandomGenerator.paragraph({ sentences: 3 });

  const updateBody = {
    appeal_status: escalationStatus,
    outcome_summary: moderatorNote,
    // resolved_at intentionally omitted to keep appeal unresolved
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const escalatedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.communityModerator.appeals.update(
      connection,
      {
        appealId: originalAppealId as string & tags.Format<"uuid">,
        body: updateBody,
      },
    );
  typia.assert(escalatedAppeal);

  // Step 6: business assertions
  // 6.1 Status changed to escalation status
  TestValidator.equals(
    "appeal status should be escalated",
    escalatedAppeal.appeal_status,
    escalationStatus,
  );

  // 6.2 resolved_at remains null (no final decision yet)
  TestValidator.equals(
    "escalated appeal should remain unresolved",
    escalatedAppeal.resolved_at ?? null,
    null,
  );

  // 6.3 Associations remain unchanged
  TestValidator.equals(
    "report association should remain unchanged",
    escalatedAppeal.report.id,
    originalReportId,
  );

  TestValidator.equals(
    "moderationAction association should remain unchanged",
    escalatedAppeal.moderationAction?.id ?? null,
    originalModerationActionId ?? null,
  );

  TestValidator.equals(
    "userSanction association should remain unchanged",
    escalatedAppeal.userSanction?.id ?? null,
    originalUserSanctionId ?? null,
  );

  TestValidator.equals(
    "appellant member user association should remain unchanged",
    escalatedAppeal.appellantMemberUser?.id ?? null,
    originalAppellantId ?? null,
  );

  // 6.4 updated_at is strictly greater than original updated_at
  TestValidator.predicate(
    "updated_at should be advanced after escalation",
    new Date(escalatedAppeal.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );
}
