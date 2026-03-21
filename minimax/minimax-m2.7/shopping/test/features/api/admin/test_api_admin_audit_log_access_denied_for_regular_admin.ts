import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_log_access_denied_for_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular administrator account
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(regularAdmin);
  // 2. Create authenticated connection for regular admin
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${regularAdmin.token.access}`,
    },
  };
  // 3. Attempt to retrieve an audit log entry (regular admin should be denied)
  // Use a random UUID for the logId
  const randomLogId = typia.random<string & tags.Format<"uuid">>();
  // 4. Verify the response returns HTTP 403 Forbidden
  await TestValidator.httpError(
    "regular admin cannot access audit logs",
    403,
    async () =>
      await api.functional.ecommerceMall.admin.admin.audit_logs.at(
        authenticatedConnection,
        {
          logId: randomLogId,
        },
      ),
  );
}
