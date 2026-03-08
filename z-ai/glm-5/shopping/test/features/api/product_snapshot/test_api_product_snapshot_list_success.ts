import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Call snapshot list API with pagination parameters
  const productId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.shoppingMall.administrator.products.snapshots.index(
      adminConnection,
      {
        productId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination structure
  TestValidator.equals("pagination.current", response.pagination.current, 1);
  TestValidator.equals("pagination.limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination.records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages >= 0",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 5. Validate variantCount is non-negative for each snapshot (business rule)
  for (const snapshot of response.data) {
    TestValidator.predicate(
      "snapshot.variantCount >= 0",
      snapshot.variantCount >= 0,
    );
  }
  // 6. Validate sorting (descending order by created_at - business rule)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        "snapshots sorted descending by created_at",
        new Date(response.data[i - 1].created_at) >=
          new Date(response.data[i].created_at),
      );
    }
  }
  // 7. Validate pagination calculation (business rule)
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pagination.pages correctly calculated",
    response.pagination.pages,
    expectedPages,
  );
}
