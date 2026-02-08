import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSalesAnalytic";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSalesAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_analytics_sales_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Try to call PATCH /shoppingMall/administrator/analytics/sales without authorization
  await TestValidator.httpError(
    "unauthorized access rejection at administrator analytics sales",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.analytics.sales.index(
        connection,
        {
          body: {}, // empty request body since no filters are required
        },
      );
    },
  );
}
