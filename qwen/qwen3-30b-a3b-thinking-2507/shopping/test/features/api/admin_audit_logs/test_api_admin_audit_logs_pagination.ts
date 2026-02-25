import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Test pagination with multiple combinations
  const pages = [1, 2, 3];
  const limits = [10, 30, 50];
  for (const page of pages) {
    for (const limit of limits) {
      const response = await api.functional.ecommerce.admin.audit_logs.index(
        adminConnection,
        {
          body: {
            page: page,
            limit: limit,
          } satisfies IEcommerceAdminAuditLog.IRequest,
        },
      );
      typia.assert(response);
      // Validate pagination metrics
      TestValidator.equals(
        `Pagination metrics for page ${page} with limit ${limit}`,
        response.pagination.current,
        page,
      );
      TestValidator.equals(
        `Pagination metrics for page ${page} with limit ${limit}`,
        response.pagination.limit,
        limit,
      );
      TestValidator.predicate(
        `Total records should be positive for page ${page} with limit ${limit}`,
        response.pagination.records > 0,
      );
    }
  }
}
