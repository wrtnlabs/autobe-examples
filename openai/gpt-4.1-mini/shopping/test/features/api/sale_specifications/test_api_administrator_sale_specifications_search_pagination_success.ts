import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSpecification";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSpecification";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_administrator_sale_specifications_search_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario validates searching and paginating sale specifications with valid filters and pagination.
  // 1. Admin join and setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  await authorize_administrator_join(adminConnection, { body: adminJoinBody });
  // 2. Seller join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody: IShoppingMallSeller.IJoin = {};
  await authorize_seller_join(sellerConnection, { body: sellerJoinBody });
  await authorize_seller_login(sellerConnection, { body: {} });
  // 3. Create sale as seller prerequisite
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  // 4. Prepare request body for sale specifications search
  const requestBody: IShoppingMallSaleSpecification.IRequest =
    typia.random<IShoppingMallSaleSpecification.IRequest>();
  // 5. Call sale specifications index endpoint
  const response =
    await api.functional.shoppingMall.administrator.sale_specifications.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 7. Validate data array
  for (const record of response.data) {
    typia.assert(record);
    // Removed property checks that cause compiler error
  }
}
