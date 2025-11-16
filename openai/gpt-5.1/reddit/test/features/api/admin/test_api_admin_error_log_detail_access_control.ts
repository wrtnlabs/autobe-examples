import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformErrorLog";

export async function test_api_admin_error_log_detail_access_control(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authorized adminUser context and JWT.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert<IAuthorizationToken>(admin.token);
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(admin);

  // 2. Create a system configuration to initialize logging-related behavior.
  const systemConfigBody = {
    category: "logging",
    config_key: "error_logging_enabled",
    value: "true",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const systemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: systemConfigBody,
      },
    );
  typia.assert<ICommunityPlatformSystemConfig>(systemConfig);

  // 3. Search error logs with broad filters to obtain at least one errorLogId.
  const errorLogSearchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sortBy: "occurred_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformErrorLog.IRequest;

  const pageResult =
    await api.functional.communityPlatform.adminUser.errorLogs.index(
      connection,
      {
        body: errorLogSearchBody,
      },
    );
  typia.assert<IPageICommunityPlatformErrorLog.ISummary>(pageResult);

  // Ensure there is at least one error log to test detail retrieval.
  await TestValidator.predicate(
    "there must be at least one error log summary to test details",
    async () => pageResult.data.length > 0,
  );

  const summary = pageResult.data[0];
  const errorLogId = summary.id;

  // 4. Positive case: authenticated adminUser can fetch error log details.
  const detail = await api.functional.communityPlatform.adminUser.errorLogs.at(
    connection,
    {
      errorLogId,
    },
  );
  typia.assert<ICommunityPlatformErrorLog>(detail);

  TestValidator.equals(
    "detail id must match summary id",
    detail.id,
    summary.id,
  );

  // 5. Negative case: unauthenticated (anonymous) access must fail.
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to error log detail must be rejected",
    async () => {
      await api.functional.communityPlatform.adminUser.errorLogs.at(
        anonymousConnection,
        {
          errorLogId,
        },
      );
    },
  );
}
