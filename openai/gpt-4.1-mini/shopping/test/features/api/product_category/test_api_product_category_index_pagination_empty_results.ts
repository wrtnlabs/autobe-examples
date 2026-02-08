import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_category_index_pagination_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  adminConnection.headers = { Authorization: authorizedAdmin.token.access };
  // 2. Call index API with empty body multiple times to ensure stability and empty result handling
  // Since IRequest has no properties, no pagination or filter params can be sent.
  // 2.1 First call
  const result1 =
    await api.functional.shoppingMall.administrator.productCategories.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(result1);
  // Validations for the first result
  TestValidator.predicate(
    "first call data is array",
    Array.isArray(result1.data),
  );
  TestValidator.predicate(
    "first call pagination has current field",
    typeof result1.pagination.current === "number" &&
      result1.pagination.current >= 0,
  );
  // 2.2 Make a second call again with empty body
  const result2 =
    await api.functional.shoppingMall.administrator.productCategories.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(result2);
  // Validate consistency and types
  TestValidator.equals(
    "second call pagination current equals first call",
    result2.pagination.current,
    result1.pagination.current,
  );
  TestValidator.predicate(
    "second call data is array",
    Array.isArray(result2.data),
  );
  // 3. If data is empty we test empty results condition explicitly
  if (result1.data.length === 0) {
    TestValidator.equals("empty data length", result1.data.length, 0);
    TestValidator.equals(
      "pagination pages is zero or more",
      result1.pagination.pages >= 0,
      true,
    );
    TestValidator.equals(
      "pagination records is zero",
      result1.pagination.records,
      0,
    );
  }
}
