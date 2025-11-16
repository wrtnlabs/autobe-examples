import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuditLog";

export async function test_api_admin_audit_logs_filter_by_action_type_and_severity(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and obtain authorized context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create at least one system configuration entry as this admin.
  const systemConfigBody = {
    category: "audit_test",
    config_key: RandomGenerator.alphabets(8),
    value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const systemConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: systemConfigBody },
    );
  typia.assert(systemConfig);

  // 3. Perform an initial broad audit log query for this admin to discover actual action_type and severity values.
  const now = new Date();
  const from = new Date(now.getTime() - 1000 * 60 * 10).toISOString(); // 10 minutes ago
  const to = new Date(now.getTime() + 1000 * 60 * 10).toISOString(); // 10 minutes ahead (just in case of clock skew)

  const initialRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    actor_type: "adminUser",
    actor_key: admin.id,
    created_at_from: from,
    created_at_to: to,
    sort_by: "created_at",
    sort_direction: "desc" as const,
  } satisfies ICommunityPlatformAuditLog.IRequest;

  const initialPage: IPageICommunityPlatformAuditLog.ISummary =
    await api.functional.communityPlatform.adminUser.auditLogs.index(
      connection,
      { body: initialRequest },
    );
  typia.assert(initialPage);

  const initialPagination: IPage.IPagination = initialPage.pagination;
  typia.assert(initialPagination);

  // Basic sanity checks on pagination metadata.
  TestValidator.predicate(
    "pagination current page should be non-negative",
    initialPagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    initialPagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    initialPagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    initialPagination.pages >= 0,
  );

  const initialData: ICommunityPlatformAuditLog.ISummary[] = initialPage.data;

  if (initialData.length === 0) {
    // If no audit logs exist yet for this admin within the time window,
    // we can only assert that the endpoint works and returns an empty set
    // with consistent pagination metadata.
    TestValidator.equals(
      "no audit logs found for admin within time range",
      initialData.length,
      0,
    );
    TestValidator.equals(
      "records should be zero when no data returned",
      initialPagination.records,
      0,
    );
    return;
  }

  // 4. Derive filter criteria from an existing audit log entry.
  const seed: ICommunityPlatformAuditLog.ISummary = initialData[0];
  typia.assert(seed);

  const filterRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    actor_type: seed.actor_type,
    actor_key: seed.actor_key ?? undefined,
    action_types: [seed.action_type],
    resource_type: seed.resource_type ?? undefined,
    resource_key: seed.resource_key ?? undefined,
    severity_levels: [seed.severity],
    success: seed.success,
    created_at_from: seed.created_at,
    created_at_to: seed.created_at,
    correlation_id: seed.correlation_id ?? undefined,
    sort_by: "created_at",
    sort_direction: "desc" as const,
  } satisfies ICommunityPlatformAuditLog.IRequest;

  const filteredPage: IPageICommunityPlatformAuditLog.ISummary =
    await api.functional.communityPlatform.adminUser.auditLogs.index(
      connection,
      { body: filterRequest },
    );
  typia.assert(filteredPage);

  const filteredData: ICommunityPlatformAuditLog.ISummary[] = filteredPage.data;

  // Positive filter: every returned entry must match action_type and severity.
  TestValidator.predicate(
    "all filtered audit logs must match requested action_type and severity",
    filteredData.every((log) => {
      return (
        filterRequest.action_types !== undefined &&
        filterRequest.severity_levels !== undefined &&
        filterRequest.action_types.includes(log.action_type) &&
        filterRequest.severity_levels.includes(log.severity)
      );
    }),
  );

  // 5. Non-overlapping filter: change severity_levels to a value that should not match.
  const nonOverlappingSeverity = `${seed.severity}_nonexistent`;

  const negativeFilterRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    actor_type: seed.actor_type,
    actor_key: seed.actor_key ?? undefined,
    action_types: [seed.action_type],
    resource_type: seed.resource_type ?? undefined,
    resource_key: seed.resource_key ?? undefined,
    severity_levels: [nonOverlappingSeverity],
    success: seed.success,
    created_at_from: seed.created_at,
    created_at_to: seed.created_at,
    correlation_id: seed.correlation_id ?? undefined,
    sort_by: "created_at",
    sort_direction: "desc" as const,
  } satisfies ICommunityPlatformAuditLog.IRequest;

  const negativePage: IPageICommunityPlatformAuditLog.ISummary =
    await api.functional.communityPlatform.adminUser.auditLogs.index(
      connection,
      { body: negativeFilterRequest },
    );
  typia.assert(negativePage);

  const negativePagination: IPage.IPagination = negativePage.pagination;
  typia.assert(negativePagination);

  TestValidator.equals(
    "non-overlapping filter should return empty data",
    negativePage.data.length,
    0,
  );
  TestValidator.equals(
    "non-overlapping filter should have zero records",
    negativePagination.records,
    0,
  );
}
