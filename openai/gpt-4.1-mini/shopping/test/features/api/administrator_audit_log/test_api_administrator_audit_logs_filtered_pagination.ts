import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorAuditLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_audit_logs_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving audit logs with filtered queries and pagination.
  // 1. Create administrator connection and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  typia.assert(adminConnection.headers?.Authorization);
  // 2. Prepare filter scenarios
  // Since the IRequest and ISummary don't have explicit properties, generate
  // representative filters for typical audit log parameters such as:
  // eventType, actorType, actorId, ip, createdAt date range, limit, and offset.
  // Use random but realistic values where applicable.
  // For demonstration, we will simulate these filters as partial of any
  // because the DTO IRequest properties are opaque from given info.
  // We will generate several different filter variations.
  // 3. Test: basic call with empty filter (should return some data or empty list)
  {
    const output = await api.functional.shoppingMall.auditLogs.index(
      adminConnection,
      {
        body: {},
      },
    );
    typia.assert(output);
    TestValidator.predicate(
      "pagination.pages >= 0",
      output.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination.limit >= 0",
      output.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination.current >= 0",
      output.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination.records >= 0",
      output.pagination.records >= 0,
    );
    TestValidator.predicate("data is array", Array.isArray(output.data));
  }
  // 4. Reasonable filters to test - eventType, actorType, actorId, ip, date range
  // Since no concrete properties are given, use plausible query property names:
  // eventType: string, actorType: string, actorId: string, ip: string
  // createdAtGte: string - ISO date, createdAtLte: string - ISO date
  const now = new Date().toISOString();
  const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(); // 1 week ago
  const filters: Partial<IShoppingMallAdministratorAuditLog.IRequest>[] = [
    { eventType: "login" },
    { actorType: "administrator" },
    { actorId: typia.random<string & tags.Format<"uuid">>() },
    { ip: "127.0.0.1" },
    { createdAtGte: past },
    { createdAtLte: now },
    { createdAtGte: past, createdAtLte: now },
  ];
  for (const filter of filters) {
    const output = await api.functional.shoppingMall.auditLogs.index(
      adminConnection,
      {
        body: filter as IShoppingMallAdministratorAuditLog.IRequest,
      },
    );
    typia.assert(output);
    TestValidator.predicate(
      "pagination.pages >= 0",
      output.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination.limit >= 0",
      output.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination.current >= 0",
      output.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination.records >= 0",
      output.pagination.records >= 0,
    );
    TestValidator.predicate("data is array", Array.isArray(output.data));
    // Validate output.data items shape excluding sensitive metadata (unavailable)
    for (const log of output.data) {
      typia.assert(log);
    }
  }
  // 5. Test pagination limit and offset
  {
    // Try limit=5 and offset=0
    const filter = {
      limit: 5,
      offset: 0,
    } as IShoppingMallAdministratorAuditLog.IRequest;
    const output = await api.functional.shoppingMall.auditLogs.index(
      adminConnection,
      {
        body: filter,
      },
    );
    typia.assert(output);
    TestValidator.predicate("limit<=5", output.data.length <= 5);
    TestValidator.equals("pagination.limit", output.pagination.limit, 5);
    // If more than 5 records exist, fetching next page offset=5
    if (output.pagination.records > 5) {
      const nextOutput = await api.functional.shoppingMall.auditLogs.index(
        adminConnection,
        {
          body: {
            limit: 5,
            offset: 5,
          } as IShoppingMallAdministratorAuditLog.IRequest,
        },
      );
      typia.assert(nextOutput);
      TestValidator.predicate(
        "limit<=5 for page 2",
        nextOutput.data.length <= 5,
      );
      TestValidator.equals(
        "pagination.limit page 2",
        nextOutput.pagination.limit,
        5,
      );
    }
  }
  // 6. Test empty result with unlikely filter
  {
    const filter = {
      eventType: "nonexistent_event_type_abcdef",
      actorType: "nonexistent_actor_type_xyz",
      actorId: "00000000-0000-0000-0000-000000000000",
      ip: "0.0.0.0",
      // Use a future date range to avoid hits
      createdAtGte: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      createdAtLte: new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 2,
      ).toISOString(),
    } as IShoppingMallAdministratorAuditLog.IRequest;
    const output = await api.functional.shoppingMall.auditLogs.index(
      adminConnection,
      {
        body: filter,
      },
    );
    typia.assert(output);
    TestValidator.equals("data length zero", output.data.length, 0);
    TestValidator.equals(
      "pagination.records zero",
      output.pagination.records,
      0,
    );
  }
  // 7. Unauthorized access test - base connection without authorization
  await TestValidator.httpError(
    "unauthorized access base connection",
    401,
    async () => {
      await api.functional.shoppingMall.auditLogs.index(connection, {
        body: {},
      });
    },
  );
}
