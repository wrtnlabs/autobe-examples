import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_shopping_mall_seller_inventory_histories_query_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and obtains authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(connection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 2. Assume a product variant exists for testing inventory histories
  // Since no utility or API to create product variant is given, we generate
  // a UUID for variantId to simulate the test scenario
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // Prepare filter and pagination body for inventory history query
  // Use reasonable pagination and filtering parameters
  const now = new Date();
  const oneMonthAgoISO = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const nowISO = now.toISOString();
  // Since IShoppingMallInventoryHistory.IRequest schema is empty in the definition,
  // we use an empty object as body
  const requestBody: IShoppingMallInventoryHistory.IRequest = {};
  // 3. Call the inventory history index API for the variant
  const response =
    await api.functional.shoppingMall.seller.productVariants.inventoryHistories.index(
      sellerConnection,
      {
        variantId,
        body: requestBody,
      },
    );
  // 4. Validate response structure
  typia.assert(response);
  // 5. Validate pagination metadata correctness
  const { pagination, data } = response;
  TestValidator.predicate(
    "Pagination current page is positive",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "Pagination limit is positive",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "Pagination pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "Pagination records is non-negative",
    pagination.records >= 0,
  );
  // 6. Assert all records belong to the requested variantId
  for (const history of data) {
    // As the IShoppingMallInventoryHistory.ISummary schema is empty,
    // we cannot verify variantId directly
    // But since the response is supposed to be filtered by variantId,
    // we implicitly trust the system and just assert the structure
    typia.assert(history);
  }
  // 7. Authorization enforcement: test unauthorized access
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "Unauthorized access should return 401",
    401,
    async () => {
      await api.functional.shoppingMall.seller.productVariants.inventoryHistories.index(
        unauthenticatedConnection,
        {
          variantId,
          body: requestBody,
        },
      );
    },
  );
}
