import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministratorAuditLog";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_audit_logs_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(authorized);
  const administratorId: string = authorized.administrator.id;
  // Request page 1 with limit=2
  const page1 =
    await api.functional.eCommerceMall.superAdministrator.administrators.audit_logs.index(
      superAdminConnection,
      {
        administratorId,
        body: {
          page: 1,
          limit: 2,
        } satisfies IECommerceMallAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(page1);
  // Validate page 1 pagination metadata
  const limit: number = 2;
  const records: number = page1.pagination.records;
  const pages: number = page1.pagination.pages;
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, limit);
  TestValidator.predicate("page 1 has records", records > 0);
  TestValidator.equals(
    "pages computed as ceil(records/limit)",
    pages,
    Math.ceil(records / limit) satisfies number as number,
  );
  // Collect IDs from page 1
  const allIds: string[] = [...page1.data.map((r) => r.id)];
  // Traverse remaining pages sequentially
  let currentPage: number = 2;
  while (currentPage <= pages) {
    const page =
      await api.functional.eCommerceMall.superAdministrator.administrators.audit_logs.index(
        superAdminConnection,
        {
          administratorId,
          body: {
            page: currentPage,
            limit,
          } satisfies IECommerceMallAdministratorAuditLog.IRequest,
        },
      );
    typia.assert(page);
    // Verify no overlap with IDs from previous pages
    for (const record of page.data) {
      TestValidator.predicate(
        `page ${currentPage} record ${record.id} is not duplicated`,
        false === allIds.includes(record.id),
      );
      allIds.push(record.id);
    }
    currentPage++;
  }
  // Verify total unique records matches the pagination metadata
  TestValidator.equals(
    "total traversed records matches pagination records count",
    allIds.length,
    records,
  );
  // Request page 1 with a different limit (limit=5)
  const page1Limit5 =
    await api.functional.eCommerceMall.superAdministrator.administrators.audit_logs.index(
      superAdminConnection,
      {
        administratorId,
        body: {
          page: 1,
          limit: 5,
        } satisfies IECommerceMallAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(page1Limit5);
  // Validate pagination metadata updated for the new limit
  TestValidator.equals(
    "page 1 with limit=5 current",
    page1Limit5.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 with limit=5 limit",
    page1Limit5.pagination.limit,
    5,
  );
  TestValidator.equals(
    "records count unchanged with different limit",
    page1Limit5.pagination.records,
    records,
  );
  TestValidator.equals(
    "pages recomputed with limit=5",
    page1Limit5.pagination.pages,
    Math.ceil(records / 5) satisfies number as number,
  );
  // Verify first record is consistent regardless of page size
  TestValidator.equals(
    "first record id same with different limit",
    page1Limit5.data[0].id,
    page1.data[0].id,
  );
}
