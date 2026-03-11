import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_audit_logs_regular_admin_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular administrator account via utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const regularAdmin: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    });
  typia.assert(regularAdmin);
  // 2. Create actor-specific connection for the test request
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: regularAdmin.token.access,
  };
  // 3. Test that regular admin cannot access audit logs endpoint (should return 403)
  await TestValidator.httpError(
    "regular admin should not access audit logs (403)",
    403,
    async () => {
      await api.functional.ecommerceMall.admin.audit_logs.index(
        adminConnection,
        {
          body: {} satisfies IEcommerceMallAdminAuditLog.IRequest,
        },
      );
    },
  );
  // 4. Verify the error response has no audit log data
  // This is implicitly validated by TestValidator.httpError throwing on 403
}