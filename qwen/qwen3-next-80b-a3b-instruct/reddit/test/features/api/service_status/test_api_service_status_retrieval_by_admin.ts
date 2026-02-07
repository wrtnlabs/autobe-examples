import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityServiceStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityServiceStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_service_status_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Admin retrieves the complete operational status of a specific monitored service by its UUID identifier. The system must return all fields (id, service_name, status, last_checked, description, created_at, updated_at) for active records where deleted_at is null, demonstrating proper soft deletion filtering. This validates that administrators can monitor system health through direct lookup of service records without accessing deleted historical data.
  // 1. Authorize admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Generate a valid service status ID
  const serviceStatusId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve service status using admin connection
  const serviceStatus =
    await api.functional.community.admin.service_statuses.getByStatusid(
      adminConnection,
      { statusId: serviceStatusId },
    );
  typia.assert(serviceStatus);
  // Cannot validate individual properties as ICommunityServiceStatus is defined as empty object
  // This is a limitation of the provided DTO definition
  // The typia.assert() call validates the response conforms to the empty object structure
}
