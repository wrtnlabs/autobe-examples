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
 * Verify that moderation action reason_summary and notes_internal fields are
 * correctly stored and returned when a community moderator records an action on
 * a member-submitted report.
 *
 * Business context:
 *
 * - Member users submit reports against content or users via the
 *   community_platform_reports surface.
 * - Community moderators then review those reports and record moderation
 *   decisions as moderation actions, optionally including a concise
 *   reason_summary and more detailed internal notes.
 * - For later audits, appeals, and training, it is critical that these
 *   qualitative text fields are persisted exactly as entered by the moderator,
 *   without truncation or corruption.
 *
 * Test flow:
 *
 * 1. Register a memberUser account via /auth/memberUser/join.
 * 2. (Conceptually) ensure we are authenticated as that memberUser; the SDK
 *    handles token propagation from the join call.
 * 3. Create a base report as that member user using
 *    api.functional.communityPlatform.memberUser.reports.create, providing a
 *    valid ICommunityPlatformReport.ICreate body with realistic values for
 *    reporter_type, report_reason_category_id, optional community_id, severity,
 *    and description.
 *
 *    - Because we do not have a dedicated API to create reason categories or
 *         communities, we use typia.random to generate suitable UUIDs and
 *         strings that satisfy the DTO constraints; the backend test fixtures
 *         are assumed to accept these in the E2E environment.
 * 4. Register a communityModerator account via /auth/communityModerator/join.
 * 5. (Conceptually) ensure we are authenticated as that communityModerator; again,
 *    the SDK updates the connection for us.
 * 6. Prepare a specific ICommunityPlatformModerationAction.ICreate request body
 *    that includes:
 *
 *    - Action_type: a concrete value like "warn_user".
 *    - Target_scope: a concrete value like "user".
 *    - Reason_summary: a short, human-readable phrase.
 *    - Notes_internal: a multi-sentence, longer paragraph describing the rationale
 *         in more detail.
 *    - Community_id: we can pass null, since it is optional in the DTO.
 * 7. Call
 *    api.functional.communityPlatform.communityModerator.reports.moderationActions.create
 *    with the previously created report.id as reportId and the prepared body.
 * 8. Validate the response:
 *
 *    - Use typia.assert to ensure the payload conforms to
 *         ICommunityPlatformModerationAction.
 *    - Use TestValidator.equals (with descriptive titles) to assert that
 *         action_type, target_scope, reason_summary, and notes_internal exactly
 *         match the values we sent in the request.
 *
 * Implementation details and constraints:
 *
 * - Use only the provided imports and DTOs; do not add extra imports or access
 *   non-existent properties.
 * - Use satisfies with the correct DTO variant (IJoinRequest, ILoginRequest,
 *   IJoin, ILogin, ICommunityPlatformReport.ICreate,
 *   ICommunityPlatformModerationAction.ICreate) when constructing request
 *   bodies.
 * - Use RandomGenerator and typia.random with appropriate tags for realistic test
 *   data where necessary (emails, URLs, UUIDs).
 * - Do not attempt to test error conditions or type mismatches; focus solely on
 *   the successful persistence and echoing back of the text fields.
 */
export async function test_api_moderation_action_internal_notes_and_reason_summary_persistence(
  connection: api.IConnection,
) {
  // 1. Register a member user (join)
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

  // 2. As that member user, create a base report
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportBody,
      },
    );
  typia.assert(report);

  // 3. Register a community moderator (join)
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://community.example.com/moderator/signup",
    referrer: "https://community.example.com/moderator/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 4. Prepare moderation action payload with specific reason_summary and notes_internal
  const actionReasonSummary =
    "Warn user for repeated low-level policy violations";
  const actionNotesInternal = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 3,
    wordMax: 10,
  });

  const moderationActionBody = {
    community_id: null,
    action_type: "warn_user",
    target_scope: "user",
    reason_summary: actionReasonSummary,
    notes_internal: actionNotesInternal,
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: moderationActionBody,
      },
    );
  typia.assert(moderationAction);

  // 5. Validate that the response echoes back our qualitative fields exactly
  TestValidator.equals(
    "moderation action action_type should match request",
    moderationAction.action_type,
    moderationActionBody.action_type,
  );
  TestValidator.equals(
    "moderation action target_scope should match request",
    moderationAction.target_scope,
    moderationActionBody.target_scope,
  );
  TestValidator.equals(
    "moderation action reason_summary should be persisted as provided",
    moderationAction.reason_summary,
    moderationActionBody.reason_summary,
  );
  TestValidator.equals(
    "moderation action notes_internal should be persisted as provided",
    moderationAction.notes_internal,
    moderationActionBody.notes_internal,
  );
}
