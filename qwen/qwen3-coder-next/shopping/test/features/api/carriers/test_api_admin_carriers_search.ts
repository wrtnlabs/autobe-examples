import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingCarrier";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShippingCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrier";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_carriers_search(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Test: Retrieve all carriers (API doesn't support search parameters)
  const carriers =
    await api.functional.shoppingMall.admin.carriers.index(adminConnection);
  typia.assert(carriers);
  // Validate pagination structure
  TestValidator.predicate("has pagination", carriers.pagination !== undefined);
  TestValidator.predicate("has data array", Array.isArray(carriers.data));
  TestValidator.predicate(
    "pagination has correct fields",
    carriers.pagination.current > 0 &&
      carriers.pagination.limit >= 0 &&
      carriers.pagination.records >= 0 &&
      carriers.pagination.pages >= 0,
  );
}
