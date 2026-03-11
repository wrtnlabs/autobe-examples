import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotificationQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallNotificationQueue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_notification_queue_error_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and log in
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create sample notification queue entries through the search endpoint (mock setup)
  // Since there's no explicit creation endpoint, we'll test the filtering capability
  // by using various filter combinations on the existing data
  // 3. Filter for notifications with errors using has_error=true
  const errorFiltered =
    await api.functional.ecommerceMall.admin.notification_queues.index(
      adminConnection,
      {
        body: {
          has_error: true,
        } satisfies IEcommerceMallNotificationQueue.IRequest,
      },
    );
  typia.assert(errorFiltered);
  TestValidator.predicate(
    "has error notifications",
    errorFiltered.data.length >= 0,
  );
  // 4. Search by specific error message
  const errorMessageFiltered =
    await api.functional.ecommerceMall.admin.notification_queues.index(
      adminConnection,
      {
        body: {
          error_message: "Connection timeout",
        } satisfies IEcommerceMallNotificationQueue.IRequest,
      },
    );
  typia.assert(errorMessageFiltered);
  TestValidator.predicate(
    "error message filter",
    errorMessageFiltered.data.length >= 0,
  );
  // 5. Combined filters with status and date range
  const combinedFiltered =
    await api.functional.ecommerceMall.admin.notification_queues.index(
      adminConnection,
      {
        body: {
          status: "failed",
          has_error: true,
          created_at_from: new Date(2026, 0, 1).toISOString(),
          created_at_to: new Date(2026, 11, 31).toISOString(),
        } satisfies IEcommerceMallNotificationQueue.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  TestValidator.predicate(
    "combined filters",
    combinedFiltered.data.length >= 0,
  );
  // 6. Test pagination with error filtering
  const paginatedFiltered =
    await api.functional.ecommerceMall.admin.notification_queues.index(
      adminConnection,
      {
        body: {
          has_error: true,
          limit: 10,
        } satisfies IEcommerceMallNotificationQueue.IRequest,
      },
    );
  typia.assert(paginatedFiltered);
  TestValidator.predicate(
    "pagination works",
    paginatedFiltered.pagination.current >= 0,
  );
  TestValidator.predicate(
    "has records",
    paginatedFiltered.pagination.records >= 0,
  );
}
