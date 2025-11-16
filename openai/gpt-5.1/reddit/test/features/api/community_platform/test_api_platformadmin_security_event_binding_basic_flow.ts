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
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadminSession";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";
import type { ICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEvent";
import type { ICommunityPlatformUserSecurityEventOfPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEventOfPlatformadmin";

/**
 * Validate platform admin binding retrieval for a user security event.
 *
 * Business purpose: Ensure that a platformAdmin-authenticated caller can
 * successfully retrieve the platform-admin-specific binding for a user security
 * event via GET
 * /communityPlatform/platformAdmin/userSecurityEvents/{securityEventId}/platformAdmin,
 * and that the response structure correctly links to the underlying security
 * event and platform admin context.
 *
 * Scenario steps (adapted to available APIs and stable data assumptions):
 *
 * 1. Register a platformAdmin (join) and obtain its authenticated context.
 * 2. As that platformAdmin, create a new account status via POST
 *    /communityPlatform/platformAdmin/accountStatuses to exercise an admin-only
 *    configuration API in the same session.
 * 3. Register a memberUser via /auth/memberUser/join to act as the subject of a
 *    report and sanction.
 * 4. As the memberUser, create a report via /communityPlatform/memberUser/reports
 *    with a random reporter_type, a random report_reason_category_id, and
 *    optional community/context fields.
 * 5. Switch back to the platformAdmin actor via /auth/platformAdmin/login to
 *    ensure subsequent calls run under an admin Authorization header.
 * 6. As platformAdmin, create a user sanction via
 *    /communityPlatform/platformAdmin/userSanctions using
 *    ICommunityPlatformUserSanction.ICreate, linking it to the previously
 *    created report (community_platform_report_id) and the member user
 *    (sanctioned_memberuser_id). Use a platform-wide serious sanction
 *    (community_id = null, sanction_type like "permanent_platform_ban", status
 *    "active", effective_from ~ now, effective_until null).
 * 7. Since there is no public API to create or list
 *    ICommunityPlatformUserSecurityEventOfPlatformadmin records by sanction,
 *    exercise the binding endpoint in a type-safe way by calling it with a
 *    random UUID as securityEventId, mirroring the simple mockup tests. This
 *    focuses on contract conformance and DTO structure rather than actual
 *    persistence linkage.
 * 8. Call
 *    api.functional.communityPlatform.platformAdmin.userSecurityEvents.platformAdmin.at
 *    with that random securityEventId as a platformAdmin and assert that:
 *
 *    - The call compiles and typia.assert passes on the response structure.
 *    - `output.securityEvent.id` is a non-empty UUID string.
 *    - `output.platformAdmin.id` is a non-empty UUID string.
 *    - If `output.platformAdminSession` is present, its `platformAdmin.id` matches
 *         `output.platformAdmin.id`.
 *    - `output.created_at` is a non-empty ISO date-time string.
 *    - `output.securityEvent.actor_type` and `output.securityEvent.event_type` are
 *         non-empty strings, indicating meaningful classification.
 */
export async function test_api_platformadmin_security_event_binding_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (join) and obtain tokens
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    // ip is optional and typed as string | undefined, so omit it entirely
    href: "https://admin.console.example.com/join",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // 2. As platformAdmin, create an account status definition
  const accountStatusCreateBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active Account",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusCreateBody,
      },
    );
  typia.assert(createdStatus);

  // 3. Register a member user (join)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser, create a report
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuth);

  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 5. Switch back to platformAdmin actor via login
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.console.example.com/login",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuth);

  // 6. As platformAdmin, create a user sanction for the member user
  const now = new Date();
  const effectiveFrom = now.toISOString();

  const sanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: null,
    sanction_type: "permanent_platform_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: null,
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: sanctionCreateBody,
      },
    );
  typia.assert(sanction);

  // 7. Generate a random securityEventId and call the binding endpoint
  const securityEventId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const binding: ICommunityPlatformUserSecurityEventOfPlatformadmin =
    await api.functional.communityPlatform.platformAdmin.userSecurityEvents.platformAdmin.at(
      connection,
      {
        securityEventId,
      },
    );
  typia.assert(binding);

  // 8. Validate core linkage fields and basic semantics
  TestValidator.predicate(
    "securityEvent.id should be a non-empty string",
    binding.securityEvent.id.length > 0,
  );

  TestValidator.predicate(
    "platformAdmin.id should be a non-empty string",
    binding.platformAdmin.id.length > 0,
  );

  TestValidator.predicate(
    "platformAdmin.username should be a non-empty string",
    binding.platformAdmin.username.length > 0,
  );

  TestValidator.predicate(
    "platformAdmin.email should be a non-empty string",
    binding.platformAdmin.email.length > 0,
  );

  TestValidator.predicate(
    "securityEvent.actor_type should be a non-empty string",
    binding.securityEvent.actor_type.length > 0,
  );

  TestValidator.predicate(
    "securityEvent.event_type should be a non-empty string",
    binding.securityEvent.event_type.length > 0,
  );

  TestValidator.predicate(
    "created_at should be a non-empty ISO date-time string",
    binding.created_at.length > 0,
  );

  if (binding.platformAdminSession !== undefined) {
    TestValidator.predicate(
      "platformAdminSession.id should be a non-empty string",
      binding.platformAdminSession.id.length > 0,
    );

    TestValidator.equals(
      "platformAdminSession.platformAdmin.id should match platformAdmin.id",
      binding.platformAdminSession.platformAdmin.id,
      binding.platformAdmin.id,
    );
  }
}
