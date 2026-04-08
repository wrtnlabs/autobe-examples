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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_audit_log_retrieval_by_regular_admin_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super admin account
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: "SuperAdmin123!@#" as string & tags.Format<"password">,
      href: "http://localhost:3000/admin" as string & tags.Format<"uri">,
      referrer: "http://localhost:3000/" as string & tags.Format<"uri">,
    },
  });
  // 2. Create a regular admin account via admin request
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(regularAdminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason:
        "This is a test admin request for testing access control on audit logs endpoint",
      href: "http://localhost:3000/admin/request" as string &
        tags.Format<"uri">,
      referrer: "http://localhost:3000/" as string & tags.Format<"uri">,
    },
  });
  // 3. Generate a random audit log ID (UUID format)
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // 4. Regular admin attempts to retrieve audit log - should be denied with 403
  await TestValidator.httpError(
    "regular admin cannot access audit logs",
    403,
    () =>
      api.functional.ecommerceMall.superAdmin.admin.audit_logs.at(
        regularAdminConnection,
        {
          auditLogId: auditLogId,
        },
      ),
  );
}
