import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import type { IEconomicForumMaintenanceMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumMaintenanceMode";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_maintenance_status_detection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEconomicForumAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>()
      } satisfies IEconomicForumAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Validate maintenance status when maintenance is inactive (default state)
  // The maintenance status endpoint is a read-only health check that returns true only when
  // enabled=true and current time is between scheduled_start and scheduled_end
  // Since the scenario provides no means to enable maintenance mode, we test the default state
  const status =
    await api.functional.economicForum.admin.system.maintenance.status.at(
      adminConnection,
    );
  typia.assert(status);
  TestValidator.equals(
    "maintenance status should be false when no maintenance is scheduled",
    status.value,
    false,
  );
}