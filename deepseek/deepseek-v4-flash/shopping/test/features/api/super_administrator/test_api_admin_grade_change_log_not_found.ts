import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdminGradeChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminGradeChangeLog";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_admin_grade_change_log_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin1 account
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_administrator_join(admin1Connection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  typia.assert(admin1);
  // 2. Promote admin1 to super administrator — creates superAdmin1
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin1 = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: admin1.id,
      },
    },
  );
  typia.assert(superAdmin1);
  // 3. Create admin2 — a separate administrator with no grade change logs
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_administrator_join(admin2Connection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  typia.assert(admin2);
  // 4. Fetch a non-existent grade change log for admin2 — expect 404
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent grade change log returns 404",
    404,
    async () => {
      await api.functional.eCommerceMall.superAdministrator.administrators.grade_change_logs.at(
        superAdminConnection,
        {
          administratorId: admin2.id,
          logId: nonExistentLogId,
        },
      );
    },
  );
}
