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

export async function test_api_service_status_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as system administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // 2. Generate a valid UUID for the service status ID
  const statusId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the service status record by ID
  const deletedRecord =
    await api.functional.community.admin.service_statuses.erase(
      adminConnection,
      {
        statusId,
      },
    );
  typia.assert(deletedRecord);
  // 4. No further validation possible without a read endpoint — but we have verified
  //    1. Authentication
  //    2. Correctly called delete endpoint
  //    3. Response has correct type (ICommunityServiceStatus) via typia.assert
}
