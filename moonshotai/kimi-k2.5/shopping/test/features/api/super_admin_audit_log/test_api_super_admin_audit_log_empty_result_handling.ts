import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a super administrator query returns an empty result set gracefully
 * when no audit logs match the criteria. First authenticate as super admin,
 * then query with a future date range (created_at_min and created_at_max set
 * to far future dates). Verify that the response contains an empty data array
 * (not an error) with pagination showing 0 records and 0 pages. This validates
 * the edge case handling for empty result sets, ensuring the endpoint returns
 * successful response status even when no matching logs exist.
 */
export async function test_api_super_admin_audit_log_empty_result_handling(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection using isolation pattern
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as super admin
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
  // Query audit logs with future date range to ensure no matches
  const response =
    await api.functional.ecommerceMall.superAdmin.super_admin_audit_logs.index(
      superAdminConnection,
      {
        body: {
          createdAtMin: "2099-01-01T00:00:00.000Z",
          createdAtMax: "2099-12-31T23:59:59.999Z",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(response);
  // Validate empty result handling - response should have empty data and zero pagination
  TestValidator.equals("data array is empty", response.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", response.pagination.pages, 0);
  TestValidator.equals(
    "pagination current is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    20,
  );
}
