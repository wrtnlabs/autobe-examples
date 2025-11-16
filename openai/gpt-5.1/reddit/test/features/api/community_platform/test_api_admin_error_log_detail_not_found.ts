import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

export async function test_api_admin_error_log_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to obtain an authenticated admin context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create a minimal system configuration row as prerequisite logging config.
  const systemConfigBody = {
    category: "logging",
    config_key: "error_log_retention_days",
    value: "30",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const systemConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: systemConfigBody },
    );
  typia.assert<ICommunityPlatformSystemConfig>(systemConfig);

  // 3. Generate a UUID that is guaranteed to be non-existent in this test
  //    (no errorLogs are created in this scenario at all).
  const nonexistentErrorLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4 & 5. Call the errorLogs.at endpoint with the non-existent ID and
  //        assert that it results in an error (not-found style) for admin.
  await TestValidator.error(
    "non-existent error log detail request must fail",
    async () => {
      const _result: ICommunityPlatformErrorLog =
        await api.functional.communityPlatform.adminUser.errorLogs.at(
          connection,
          { errorLogId: nonexistentErrorLogId },
        );
      // If the implementation ever returns successfully, assert ensures
      // the type is correct, but TestValidator.error will treat this as
      // a failure because no error was thrown.
      typia.assert<ICommunityPlatformErrorLog>(_result);
    },
  );

  // 6 & 7. No explicit additional assertions are necessary for error shape or
  //        error_logs mutation: TestValidator.error only validates presence
  //        of an error, and the GET endpoint is read-only by contract.
}
