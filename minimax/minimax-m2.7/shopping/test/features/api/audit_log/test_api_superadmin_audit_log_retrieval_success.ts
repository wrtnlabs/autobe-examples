import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_audit_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a connection with the token from authorization
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 3. Retrieve audit log by ID with a valid UUID
  // The join operation creates an audit log entry. Using a valid UUID format
  // to test the endpoint's response structure validation.
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const auditLog =
    await api.functional.ecommerceMall.superAdmin.superAdmin.audit_logs.at(
      authenticatedConnection,
      {
        auditLogId: auditLogId,
      },
    );
  // 4. Validate response structure with typia.assert
  // This performs complete runtime type validation including:
  // - All property existence checks
  // - All type checks (string, UUID, etc.)
  // - All format validations (UUID, date-time)
  typia.assert(auditLog);
}
