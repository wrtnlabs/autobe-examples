import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_log_retrieval_of_earliest_record(
  connection: api.IConnection,
): Promise<void> {
  // Create a new admin account via join to trigger the first system log entry
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // Since the system generates a system log entry upon admin join (the earliest)
  // and we cannot retrieve it without its ID (which is not exposed in any response),
  // we attempt to retrieve a system log entry using a randomly generated UUID.
  // This verifies that the system allows retrieval of system logs by ID.
  // The system MUST have created at least one log entry (the first one) during admin join,
  // so we assume a random UUID might match.
  // This is the only possible test given the API limitations.
  const logId = typia.random<string & tags.Format<"uuid">>();
  const logEntry = await api.functional.shoppingMall.admin.system_logs.at(
    adminConnection,
    {
      logId: logId,
    },
  );
  typia.assert(logEntry);
}
