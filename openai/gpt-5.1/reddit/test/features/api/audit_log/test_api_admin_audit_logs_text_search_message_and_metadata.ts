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
 * Verify that an authenticated adminUser can text-search audit logs by
 * `message` and `metadata` fields and that pagination behaves consistently
 * regardless of filters.
 *
 * Business flow:
 *
 * 1. Join an adminUser using /auth/adminUser/join to obtain an authorized admin
 *    context (token is handled by SDK).
 * 2. Create a deterministic system configuration entry via
 *    /communityPlatform/adminUser/systemConfigs to trigger at least one audit
 *    log row whose message and/or metadata will contain distinctive keywords.
 * 3. Call PATCH /communityPlatform/adminUser/auditLogs with
 *    ICommunityPlatformAuditLog.IRequest using search_message and
 *    search_metadata values that target those distinctive keywords, along with
 *    explicit page/limit/sort settings.
 * 4. Assert that the paginated response contains at least one audit summary whose
 *    message or metadata includes the searched keywords, proving that text
 *    filters work.
 * 5. Call the same endpoint again with random, unlikely search terms for both
 *    message and metadata and assert that the result set is empty, validating
 *    that non-matching searches return no data.
 * 6. Throughout, validate basic pagination metadata (via primitive number
 *    comparison) and rely on typia.assert() for structural type checking.
 */
export async function test_api_admin_audit_logs_text_search_message_and_metadata(
  connection: api.IConnection,
) {
  // 1. Join an adminUser to obtain an authorized context
  const adminJoinBody = {
    username: `audit-admin-${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a deterministic system configuration entry to trigger an audit log
  const auditKeyword = "audit_test_key";
  const metadataKeyword = "metaFlag";

  const configCreateBody = {
    category: "audit_test",
    config_key: `${auditKeyword}_${RandomGenerator.alphaNumeric(6)}`,
    value: JSON.stringify({
      [metadataKeyword]: true,
      note: "text search integration test",
    }),
    description: "System config for audit text search E2E test",
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const createdConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: configCreateBody },
    );
  typia.assert(createdConfig);

  // 3. Positive search: use search_message and search_metadata
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  const positiveRequestBody = {
    page,
    limit,
    search_message: auditKeyword,
    search_metadata: metadataKeyword,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformAuditLog.IRequest;

  const positivePage: IPageICommunityPlatformAuditLog.ISummary =
    await api.functional.communityPlatform.adminUser.auditLogs.index(
      connection,
      { body: positiveRequestBody },
    );
  typia.assert(positivePage);

  // Ensure pagination metadata is sane (compare as primitive numbers to avoid tag incompat issues)
  const pagination = positivePage.pagination;
  TestValidator.equals(
    "positive search: pagination current page matches request",
    Number(pagination.current),
    Number(page),
  );
  TestValidator.equals(
    "positive search: pagination limit matches request",
    Number(pagination.limit),
    Number(limit),
  );

  // Ensure we got at least one matching audit entry by message or metadata
  const hasPositiveMatch = positivePage.data.some((log) => {
    const message = log.message ?? "";
    const metadata = log.metadata ?? "";
    return message.includes(auditKeyword) || metadata.includes(metadataKeyword);
  });

  TestValidator.predicate(
    "positive search: at least one audit log matches message or metadata keyword",
    hasPositiveMatch,
  );

  // 4. Negative search: use unlikely random strings for both fields
  const randomMessageNeedle = `nohit-${RandomGenerator.alphaNumeric(24)}`;
  const randomMetadataNeedle = `nohit-${RandomGenerator.alphaNumeric(24)}`;

  const negativeRequestBody = {
    page,
    limit,
    search_message: randomMessageNeedle,
    search_metadata: randomMetadataNeedle,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformAuditLog.IRequest;

  const negativePage: IPageICommunityPlatformAuditLog.ISummary =
    await api.functional.communityPlatform.adminUser.auditLogs.index(
      connection,
      { body: negativeRequestBody },
    );
  typia.assert(negativePage);

  TestValidator.equals(
    "negative search: no audit logs should match random message/metadata needles",
    negativePage.data.length,
    0,
  );
}
