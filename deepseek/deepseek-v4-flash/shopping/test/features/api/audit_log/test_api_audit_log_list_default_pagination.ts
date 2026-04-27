import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministratorAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSuperAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSuperAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an authenticated administrator can retrieve the unified platform audit log with default pagination and no filters applied.
 *
 * Validates the default pagination behavior of the audit log listing endpoint. An administrator account is created and authenticated, then the audit log endpoint is called with an empty request body (no filters). The response pagination metadata is validated to show default values: current page 1, limit 20, records non-negative, and pages correctly computed. Each returned audit log entry is checked for correct actor_type discriminator values, and entries are verified to be sorted by created_at in descending order.
 *
 * Special attention is given to the pagination metadata consistency: pages must equal Math.ceil(records/limit). When records is 0, pages must also be 0.
 *
 * 1. Administrator joins the platform via the join endpoint and obtains JWT tokens.
 * 2. Administrator calls the audit log listing endpoint with an empty request body (default pagination).
 * 3. Validates pagination metadata: current=1, limit=20, records≥0, pages=Math.ceil(records/limit).
 * 4. If entries exist, validates that each entry has actor_type 'administrator' or 'superAdministrator'.
 * 5. If entries exist, validates that entries are sorted by created_at in descending order (newest first).
 */
export async function test_api_audit_log_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Call audit log endpoint with default pagination (empty body = no filters)
  const page =
    await api.functional.eCommerceMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {} satisfies IECommerceMallSuperAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(page);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records >= 0",
    page.pagination.records >= 0,
  );
  const expectedPages = Math.ceil(
    page.pagination.records / page.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages",
    page.pagination.pages,
    expectedPages,
  );
  // 4. Validate entry actor_type discriminator and sorting by created_at descending
  for (const entry of page.data) {
    TestValidator.predicate(
      "actor_type is administrator or superAdministrator",
      entry.actor_type === "administrator" ||
        entry.actor_type === "superAdministrator",
    );
  }
  for (let i = 1; i < page.data.length; i++) {
    TestValidator.predicate(
      `entries sorted by created_at descending at index ${i}`,
      new Date(page.data[i - 1].created_at).getTime() >=
        new Date(page.data[i].created_at).getTime(),
    );
  }
}
