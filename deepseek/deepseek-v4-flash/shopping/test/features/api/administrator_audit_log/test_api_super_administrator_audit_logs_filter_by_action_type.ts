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

export async function test_api_super_administrator_audit_logs_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    adminConnection,
    {},
  );
  typia.assert(authorized);
  // 2. Retrieve audit logs filtered by action_type = 'force_cancel_order_item'
  const page =
    await api.functional.eCommerceMall.superAdministrator.administrators.audit_logs.index(
      adminConnection,
      {
        administratorId: authorized.administrator.id,
        body: {
          action_type: "force_cancel_order_item",
        } satisfies IECommerceMallAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(page);
  // 3. Validate each entry has matching action_type
  for (const entry of page.data) {
    TestValidator.equals(
      "action_type matches filter",
      entry.action_type,
      "force_cancel_order_item",
    );
  }
  // 4. Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination records match data length",
    () =>
      page.pagination.records === 0 ||
      page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate("pagination pages is consistent", () => {
    const expectedPages =
      page.pagination.records === 0
        ? 0
        : Math.ceil(page.pagination.records / page.pagination.limit);
    return page.pagination.pages === expectedPages;
  });
}
