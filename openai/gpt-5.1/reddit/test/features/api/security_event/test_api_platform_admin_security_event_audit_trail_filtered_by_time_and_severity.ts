import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEvent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSecurityEvent";

export async function test_api_platform_admin_security_event_audit_trail_filtered_by_time_and_severity(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin (join)
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin-console.example.com/register",
    referrer: "https://admin-console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create at least one account status definition
  const statusBody = {
    key: "ACTIVE_ADMIN",
    label: "Active Platform Admin",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusBody,
      },
    );
  typia.assert(accountStatus);

  // 3. Build audit trail filter body: last 24 hours, specific severity_level
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const from = new Date(now.getTime() - oneDayMs).toISOString();
  const to = now.toISOString();

  const severityFilter = "high";

  const auditFilterBody = {
    severity_level: severityFilter,
    created_from: from,
    created_to: to,
    page: 1,
    pageSize: 50,
  } satisfies ICommunityPlatformUserSecurityEvent.IRequest;

  // 4. Call audit trail endpoint
  const auditPage: IPageICommunityPlatformUserSecurityEvent.ISummary =
    await api.functional.communityPlatform.platformAdmin.securityEvents.auditTrail.index(
      connection,
      {
        body: auditFilterBody,
      },
    );
  typia.assert(auditPage);

  const pagination: IPage.IPagination = auditPage.pagination;
  const events: ICommunityPlatformUserSecurityEvent.ISummary[] = auditPage.data;

  // 5. Basic pagination metadata checks
  TestValidator.equals(
    "current page should equal requested page",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should equal requested pageSize",
    pagination.limit,
    50,
  );

  TestValidator.predicate(
    "records should be >= number of returned events",
    () => pagination.records >= events.length,
  );

  TestValidator.predicate(
    "pages should be 0 when no records, otherwise >= 1",
    () =>
      (pagination.records === 0 && pagination.pages === 0) ||
      (pagination.records > 0 && pagination.pages >= 1),
  );

  // 6. Per-event filter validation
  for (const event of events) {
    const occurredAt = new Date(event.occurred_at).getTime();
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();

    TestValidator.predicate(
      "event.occurred_at is within requested time window",
      occurredAt >= fromMs && occurredAt <= toMs,
    );

    TestValidator.equals(
      "event.severity_level equals requested severity",
      event.severity_level,
      severityFilter,
    );
  }
}
