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
 * Test pagination and sort order on the audit log listing endpoint.
 *
 * Validates that the audit log API correctly handles pagination parameters (page, limit) and sort ordering (ascending/descending by created_at). Ensures proper boundary behavior including empty pages for out-of-range requests.
 *
 * 1. Administrator joins the platform via authorize_administrator_join to obtain an authenticated connection.
 * 2. Fetches page 1 with 5 records per page — validates pagination metadata (current=1, limit=5) and data length ≤ 5.
 * 3. Fetches page 2 with 5 records per page — validates pagination metadata (current=2, limit=5) and no overlapping IDs with page 1.
 * 4. Fetches page 1 with sort='desc' — validates entries are sorted by created_at descending (newest first).
 * 5. Fetches page 1 with sort='asc' — validates entries are sorted by created_at ascending (oldest first).
 * 6. Verifies descending and ascending produce different result sequences, confirming the sort direction affects ordering.
 * 7. Fetches a very large page number (999999) — validates empty data array with correct pagination metadata.
 */
export async function test_api_audit_log_pagination_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as an administrator and get authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Fetch page 1 with 5 records per page
  const page1 =
    await api.functional.eCommerceMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IECommerceMallSuperAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 pagination.current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 pagination.limit", page1.pagination.limit, 5);
  TestValidator.predicate("page 1 data length ≤ 5", page1.data.length <= 5);
  const page1Ids = page1.data.map((entry) => entry.id);
  // 3. Fetch page 2 with 5 records per page
  const page2 =
    await api.functional.eCommerceMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IECommerceMallSuperAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 pagination.current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 pagination.limit", page2.pagination.limit, 5);
  const page2Ids = page2.data.map((entry) => entry.id);
  const overlappingIds = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "no overlapping IDs between pages",
    overlappingIds.length,
    0,
  );
  // 4. Fetch page 1 sorted descending (newest first)
  const descPage =
    await api.functional.eCommerceMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort: "desc",
        } satisfies IECommerceMallSuperAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(descPage);
  for (let i = 1; i < descPage.data.length; i++) {
    TestValidator.predicate(
      `desc sorted: entry ${i - 1}.created_at >= entry ${i}.created_at`,
      descPage.data[i - 1].created_at >= descPage.data[i].created_at,
    );
  }
  // 5. Fetch page 1 sorted ascending (oldest first)
  const ascPage =
    await api.functional.eCommerceMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort: "asc",
        } satisfies IECommerceMallSuperAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(ascPage);
  for (let i = 1; i < ascPage.data.length; i++) {
    TestValidator.predicate(
      `asc sorted: entry ${i - 1}.created_at <= entry ${i}.created_at`,
      ascPage.data[i - 1].created_at <= ascPage.data[i].created_at,
    );
  }
  // 6. Verify descending and ascending orders produce different result sequences
  if (descPage.data.length > 0 && ascPage.data.length > 0) {
    TestValidator.notEquals(
      "desc and asc produce different id orders",
      descPage.data.map((r) => r.id),
      ascPage.data.map((r) => r.id),
    );
  }
  // 7. Request a very large page number — expect empty data
  const largePage =
    await api.functional.eCommerceMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 999999,
          limit: 5,
        } satisfies IECommerceMallSuperAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(largePage);
  TestValidator.equals("large page has empty data", largePage.data.length, 0);
  TestValidator.equals(
    "large page pagination.current",
    largePage.pagination.current,
    999999,
  );
  TestValidator.equals(
    "large page pagination.limit",
    largePage.pagination.limit,
    5,
  );
}
