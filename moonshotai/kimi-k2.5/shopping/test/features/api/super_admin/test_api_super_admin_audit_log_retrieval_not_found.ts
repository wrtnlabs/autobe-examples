import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_audit_log_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for super admin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register a new super administrator account to authenticate
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // Generate a valid UUID format that does not correspond to any existing audit log record
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent audit log entry
  const result = await api.functional.ecommerceMall.superAdmin.audit_logs.at(
    superAdminConnection,
    {
      logId: nonExistentLogId,
    },
  );
  // Verify that the result is null since the audit log entry does not exist
  TestValidator.equals("non-existent audit log returns null", result, null);
}
