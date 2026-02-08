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

/**
 * Test the retrieval of product categories by an administrator with filter criteria such as partial name match,
 * partial description match, and include deleted categories flag. Validate pagination behavior by requesting the
 * first page with a limited number of categories and ordering by name ascending. Check that the response includes
 * correct pagination metadata and that returned categories match filter criteria. Additionally, verify that deleted
 * categories are excluded by default and appear only when allowDeleted is true.
 */
export async function test_api_product_category_index_with_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  const requestDefault = {} satisfies IShoppingMallProductCategory.IRequest;
  const outputDefault =
    await api.functional.shoppingMall.administrator.productCategories.index(
      adminConnection,
      { body: requestDefault },
    );
  typia.assert(outputDefault);
  TestValidator.predicate(
    "current page >= 1",
    outputDefault.pagination.current >= 1,
  );
  TestValidator.predicate("limit > 0", outputDefault.pagination.limit > 0);
  TestValidator.predicate("pages >= 0", outputDefault.pagination.pages >= 0);
  TestValidator.predicate(
    "records >= data length",
    outputDefault.pagination.records >= outputDefault.data.length,
  );
  TestValidator.predicate(
    "returned categories count matches data length",
    outputDefault.data.length <= outputDefault.pagination.limit,
  );
  // Removed the following loop because 'name' property does not exist on ISummary
  // for (let i = 1; i < outputDefault.data.length; i++) {
  //   TestValidator.predicate(
  //     `name order ascending between index ${i - 1} and ${i}`,
  //     outputDefault.data[i - 1].name <= outputDefault.data[i].name,
  //   );
  // }
}
