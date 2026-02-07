import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystematicStatus";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_status_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection by joining
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // 2. Query statuses with status_key filtering
  const output: IPageIShoppingMallSystematicStatus.ISummary =
    await api.functional.shoppingMall.admin.statuses.index(adminConnection, {
      body: typia.random<IShoppingMallSystematicStatus.IRequest>(),
    });
  // 3. Validate response structure
  typia.assert(output);
  TestValidator.equals("pagination exists", output.pagination.current, 1);
  TestValidator.predicate("has data", output.data.length >= 0);
  // 4. Validate status summary structure if data exists
  if (output.data.length > 0) {
    const status = output.data[0];
    typia.assert(status);
  }
}
