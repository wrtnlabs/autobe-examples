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

export async function test_api_admin_audit_logs_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Join as a fresh adminUser to obtain authenticated admin context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(authorized);

  // token is already wired into connection.headers.Authorization by SDK; just sanity-check shape
  typia.assert<IAuthorizationToken>(authorized.token);

  // 2. Create at least one active system configuration row so that audit logging/config is initialized
  const systemConfigBody = {
    category: "audit",
    config_key: RandomGenerator.alphaNumeric(8),
    value: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const systemConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: systemConfigBody },
    );
  typia.assert<ICommunityPlatformSystemConfig>(systemConfig);

  // 3. Call auditLogs.index with only basic pagination parameters
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  const requestBody: ICommunityPlatformAuditLog.IRequest = {
    page,
    limit,
  };

  const pageResult: IPageICommunityPlatformAuditLog.ISummary =
    await api.functional.communityPlatform.adminUser.auditLogs.index(
      connection,
      { body: requestBody },
    );
  typia.assert<IPageICommunityPlatformAuditLog.ISummary>(pageResult);

  const pagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // 4. Assert that the pagination block reflects the requested page and limit
  TestValidator.equals(
    "pagination current page should match requested page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    pagination.limit,
    limit,
  );

  // 5. Validate that data is an array of summaries and perform basic content/order checks
  const summaries: ICommunityPlatformAuditLog.ISummary[] = pageResult.data;

  if (summaries.length > 0) {
    // Core fields basic content checks (relying on typia for type validation)
    for (const summary of summaries) {
      typia.assert<ICommunityPlatformAuditLog.ISummary>(summary);

      TestValidator.predicate(
        "audit log id should be non-empty",
        summary.id.length > 0,
      );
      TestValidator.predicate(
        "audit log actor_type should be non-empty",
        summary.actor_type.length > 0,
      );
      TestValidator.predicate(
        "audit log action_type should be non-empty",
        summary.action_type.length > 0,
      );
      TestValidator.predicate(
        "audit log severity should be non-empty",
        summary.severity.length > 0,
      );
      TestValidator.predicate(
        "audit log created_at should be non-empty",
        summary.created_at.length > 0,
      );
    }

    // Check created_at is in descending order (newest first)
    for (let i = 1; i < summaries.length; ++i) {
      const prev = summaries[i - 1];
      const curr = summaries[i];
      const prevTime = Date.parse(prev.created_at);
      const currTime = Date.parse(curr.created_at);

      TestValidator.predicate(
        "audit log created_at should be in descending order",
        prevTime >= currTime,
      );
    }
  }

  // 6. Confirm that the endpoint is read-only from the perspective of this test
  // by ensuring that re-invoking the same request does not mutate previously
  // retrieved objects and returns a structurally valid page again.
  const clonedFirstPageJson = JSON.stringify(pageResult);

  const secondPageResult: IPageICommunityPlatformAuditLog.ISummary =
    await api.functional.communityPlatform.adminUser.auditLogs.index(
      connection,
      { body: requestBody },
    );
  typia.assert<IPageICommunityPlatformAuditLog.ISummary>(secondPageResult);

  TestValidator.equals(
    "previous pageResult object should remain unchanged after second call",
    JSON.parse(clonedFirstPageJson),
    pageResult,
  );
}
