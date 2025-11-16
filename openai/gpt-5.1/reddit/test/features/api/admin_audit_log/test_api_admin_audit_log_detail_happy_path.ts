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

/**
 * Happy-path retrieval of a single admin audit log detail.
 *
 * Business goal
 *
 * - Prove that an authenticated adminUser can search the audit log, pick a
 *   concrete event, and fetch its full details by id.
 * - Ensure that the detail endpoint returns a record consistent with the summary
 *   data exposed in the index/search endpoint.
 *
 * High level steps
 *
 * 1. Register a fresh adminUser using POST /auth/adminUser/join.
 * 2. While authenticated as that admin, create a new system configuration via POST
 *    /communityPlatform/adminUser/systemConfigs to trigger at least one audit
 *    log entry (likely a `config_update` action_type).
 * 3. Query the audit logs via PATCH /communityPlatform/adminUser/auditLogs using
 *    filters that are likely to hit the just-created config event (e.g.,
 *    actor_type = "adminUser" and action_types = ["config_update"], or at least
 *    a low `limit` and recent `created_at` range).
 * 4. From the returned page of ICommunityPlatformAuditLog.ISummary rows, pick one
 *    summary and call GET /communityPlatform/adminUser/auditLogs/{auditLogId}
 *    with that id.
 * 5. Assert that the detailed ICommunityPlatformAuditLog object:
 *
 *    - Has the same id as the summary
 *    - Matches all overlapping scalar fields (actor_type, actor_key, actor_ip,
 *         actor_user_agent, action_type, resource_type, resource_key,
 *         resource_uri, success, severity, message, metadata, correlation_id,
 *         created_at).
 * 6. Validate basic business invariants such as created_at being a valid date-time
 *    string (by typia.assert) and that success/severity/message are coherent
 *    between summary and detail.
 */
export async function test_api_admin_audit_log_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and obtain authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a system configuration entry as that admin to generate an audit log
  const systemConfigBody = {
    category: "audit-test",
    config_key: `test_config_${RandomGenerator.alphaNumeric(8)}`,
    value: "true",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const createdConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: systemConfigBody,
      },
    );
  typia.assert(createdConfig);

  // 3. Query audit logs to find at least one entry, preferring config-related
  //    events if present. We use a constrained limit and descending sort.
  const auditSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    // We cannot be sure of exact action_type produced, but config_update is
    // the documented example. Use it as a filter to bias towards the event
    // we just created, while still allowing the test to fall back to any
    // log entry if none match.
    action_types: ["config_update"],
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformAuditLog.IRequest;

  const pageResult: IPageICommunityPlatformAuditLog.ISummary =
    await api.functional.communityPlatform.adminUser.auditLogs.index(
      connection,
      {
        body: auditSearchBody,
      },
    );
  typia.assert(pageResult);

  // Ensure we have at least one audit log entry to inspect
  TestValidator.predicate(
    "audit index should return at least one entry",
    pageResult.data.length > 0,
  );

  // Prefer an entry whose resource_type looks like a system config, otherwise
  // just take the first entry.
  const preferredSummary =
    pageResult.data.find(
      (log) =>
        log.resource_type === "system_config" ||
        log.action_type === "config_update",
    ) ?? pageResult.data[0];

  typia.assert<ICommunityPlatformAuditLog.ISummary>(preferredSummary);

  // 4. Fetch detailed audit log by id
  const detail: ICommunityPlatformAuditLog =
    await api.functional.communityPlatform.adminUser.auditLogs.at(connection, {
      auditLogId: preferredSummary.id,
    });
  typia.assert(detail);

  // 5. Assert that the detail record matches the summary for overlapping fields
  TestValidator.equals(
    "audit detail id should match summary id",
    detail.id,
    preferredSummary.id,
  );
  TestValidator.equals(
    "audit detail actor_type should match summary",
    detail.actor_type,
    preferredSummary.actor_type,
  );
  TestValidator.equals(
    "audit detail actor_key should match summary",
    detail.actor_key ?? null,
    preferredSummary.actor_key ?? null,
  );
  TestValidator.equals(
    "audit detail actor_ip should match summary",
    detail.actor_ip ?? null,
    preferredSummary.actor_ip ?? null,
  );
  TestValidator.equals(
    "audit detail actor_user_agent should match summary",
    detail.actor_user_agent ?? null,
    preferredSummary.actor_user_agent ?? null,
  );
  TestValidator.equals(
    "audit detail action_type should match summary",
    detail.action_type,
    preferredSummary.action_type,
  );
  TestValidator.equals(
    "audit detail resource_type should match summary",
    detail.resource_type ?? null,
    preferredSummary.resource_type ?? null,
  );
  TestValidator.equals(
    "audit detail resource_key should match summary",
    detail.resource_key ?? null,
    preferredSummary.resource_key ?? null,
  );
  TestValidator.equals(
    "audit detail resource_uri should match summary",
    detail.resource_uri ?? null,
    preferredSummary.resource_uri ?? null,
  );
  TestValidator.equals(
    "audit detail success flag should match summary",
    detail.success,
    preferredSummary.success,
  );
  TestValidator.equals(
    "audit detail severity should match summary",
    detail.severity,
    preferredSummary.severity,
  );
  TestValidator.equals(
    "audit detail message should match summary",
    detail.message ?? null,
    preferredSummary.message ?? null,
  );
  TestValidator.equals(
    "audit detail correlation_id should match summary",
    detail.correlation_id ?? null,
    preferredSummary.correlation_id ?? null,
  );
  TestValidator.equals(
    "audit detail metadata should match summary",
    detail.metadata ?? null,
    preferredSummary.metadata ?? null,
  );
  TestValidator.equals(
    "audit detail created_at should match summary",
    detail.created_at,
    preferredSummary.created_at,
  );

  // 6. Additional sanity check on pagination metadata and created_at format
  typia.assert<IPage.IPagination>(pageResult.pagination);
  TestValidator.predicate(
    "audit detail created_at should be a non-empty string",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
}
