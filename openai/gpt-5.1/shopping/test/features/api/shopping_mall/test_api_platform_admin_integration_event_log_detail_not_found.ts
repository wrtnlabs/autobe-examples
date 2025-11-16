import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallIntegrationEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallIntegrationEventLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_integration_event_log_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Join as a platform administrator to obtain an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Generate a random UUID for an integration event log id (very unlikely to exist)
  const randomId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Try to fetch the integration event log with the random id.
  //    This call may either succeed (if a log happens to exist) or fail with a not-found style error.
  //    First, attempt a best-effort call outside of TestValidator.error to validate success-path typing
  //    in case the record actually exists.
  let existingLog: IShoppingMallIntegrationEventLog | null = null;
  try {
    const log =
      await api.functional.shoppingMall.platformAdmin.integrationEventLogs.at(
        connection,
        {
          integrationEventLogId: randomId,
        },
      );
    typia.assert<IShoppingMallIntegrationEventLog>(log);
    existingLog = log;
  } catch {
    // Ignore here; we'll specifically assert error behavior in a controlled way below.
    existingLog = null;
  }

  // 4. Construct a second UUID that is different from the first one to further
  //    reduce the chance of collision and use it for explicit error expectation.
  const secondId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Sanity check: ensure the two ids differ so we are not accidentally reusing the same id
  await TestValidator.predicate(
    "random integration event log ids should differ",
    async () => randomId !== secondId,
  );

  // 5. Best-effort not-found / error-path validation: calling the detail endpoint
  //    with the second random UUID should generally fail for a non-existent record.
  await TestValidator.error(
    "platform admin fetching integration event log with extremely unlikely id should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.integrationEventLogs.at(
        connection,
        {
          integrationEventLogId: secondId,
        },
      );
    },
  );
}
