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

export async function test_api_service_status_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using join utility function
  const authorized = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  typia.assert(authorized);
  // Update service status record with random UUID and empty body
  // Since ICommunityServiceStatus.IUpdate is empty, we must pass an empty object
  // We are constrained by the empty DTO definition and cannot reference non-existent properties
  const updatedServiceStatus =
    await api.functional.community.admin.service_statuses.putByStatusid(
      adminConnection,
      {
        statusId: typia.random<string & tags.Format<"uuid">>(),
        body: {} satisfies ICommunityServiceStatus.IUpdate,
      },
    );
  typia.assert(updatedServiceStatus);
}
