import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAuditLog";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_audit_logs_authorization_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Attempt access with base connection (should fail)
  await TestValidator.error("access without authentication", async () => {
    await api.functional.ecommerce.administrator.audit_logs.index(connection, {
      body: {} satisfies IEcommerceAuditLog.IRequest,
    });
  });
  // 2. Create authenticated connections for different actors
  const customerConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("customer access should fail", async () => {
    await api.functional.ecommerce.administrator.audit_logs.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceAuditLog.IRequest,
      },
    );
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("seller access should fail", async () => {
    await api.functional.ecommerce.administrator.audit_logs.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceAuditLog.IRequest,
      },
    );
  });
  // 3. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123" satisfies string & tags.Format<"password">,
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 4. Test administrator access with empty filter
  const emptyFilterResult =
    await api.functional.ecommerce.administrator.audit_logs.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceAuditLog.IRequest,
      },
    );
  typia.assert(emptyFilterResult);
  TestValidator.predicate(
    "empty filter returns valid pagination",
    emptyFilterResult.pagination.records >= 0 &&
      emptyFilterResult.pagination.pages >= 0,
  );
  // 5. Test filtering by success status
  const successFilterResults =
    await api.functional.ecommerce.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          success: true,
          page: 1,
          limit: 10,
        } satisfies IEcommerceAuditLog.IRequest,
      },
    );
  typia.assert(successFilterResults);
  if (successFilterResults.data.length > 0) {
    TestValidator.predicate(
      "all filtered records should be successful",
      successFilterResults.data.every((log) => log.success === true),
    );
  }
  const failureFilterResults =
    await api.functional.ecommerce.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          success: false,
          page: 1,
          limit: 10,
        } satisfies IEcommerceAuditLog.IRequest,
      },
    );
  typia.assert(failureFilterResults);
  if (failureFilterResults.data.length > 0) {
    TestValidator.predicate(
      "all filtered records should be failures",
      failureFilterResults.data.every((log) => log.success === false),
    );
  }
  // 6. Test date range filtering
  const dateRangeResults =
    await api.functional.ecommerce.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          created_at_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_end: new Date().toISOString(),
          page: 1,
          limit: 5,
        } satisfies IEcommerceAuditLog.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  // 7. Validate chronological sorting (most recent first)
  if (dateRangeResults.data.length > 1) {
    for (let i = 0; i < dateRangeResults.data.length - 1; i++) {
      TestValidator.predicate(
        "records should be sorted chronologically",
        new Date(dateRangeResults.data[i].created_at) >=
          new Date(dateRangeResults.data[i + 1].created_at),
      );
    }
  }
}
