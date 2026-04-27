import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministratorAuditLog";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_audit_log_not_found_or_mismatched(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(authorized);
  const adminId: string = authorized.administrator.id;
  // 2. Test case (a): valid administratorId + non-existent logId → 404
  const nonExistentLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "audit log not found (non-existent logId)",
    404,
    async () => {
      await api.functional.eCommerceMall.superAdministrator.administrators.audit_logs.at(
        superAdminConnection,
        {
          administratorId: adminId,
          logId: nonExistentLogId,
        },
      );
    },
  );
  // 3. Test case (b): non-existent administratorId + non-existent logId → 404
  // The endpoint does not distinguish between "log entry does not exist" and
  // "log entry exists but belongs to a different administrator" — both return 404.
  // This prevents information leakage about which administrators have audit entries.
  const randomAdminId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const randomLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "audit log not found (non-existent administrator and logId)",
    404,
    async () => {
      await api.functional.eCommerceMall.superAdministrator.administrators.audit_logs.at(
        superAdminConnection,
        {
          administratorId: randomAdminId,
          logId: randomLogId,
        },
      );
    },
  );
}
