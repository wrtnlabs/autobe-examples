import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuditLogStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuditLogStatistic";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAuditLogStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLogStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_audit_logs_statistics_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // The base connection is used without authentication to attempt accessing the endpoint
  await TestValidator.httpError(
    "unauthorized access without administrator login",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.auditLogs.statistics.index(
        connection,
        { body: {} },
      );
    },
  );
}
