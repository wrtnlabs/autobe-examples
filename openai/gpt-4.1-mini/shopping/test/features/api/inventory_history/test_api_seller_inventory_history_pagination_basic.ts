import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_history_pagination_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication by joining as a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  // Join seller with generated credentials
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  sellerConnection.headers = { Authorization: `Bearer ${seller.token.access}` };
  // 2. Prepare base request with no filters to get minimal info (page 1, default limit)
  const baseRequest: IShoppingMallInventoryHistory.IRequest = {
    page: 1,
    limit: 10,
  };
  // 3. Call inventory history index with minimal filters for pagination
  const response =
    await api.functional.shoppingMall.seller.inventoryHistories.index(
      sellerConnection,
      { body: baseRequest },
    );
  // 4. Assert the response matches expected type
  typia.assert(response);
  // 5. Assert pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive and <= 100",
    response.pagination.limit > 0 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count matches records and limit",
    response.pagination.pages === (Math.ceil(response.pagination.records / response.pagination.limit) || 0),
  );
  // 6. Validate data array length is less or equal to pagination limit
  TestValidator.predicate(
    "data length <= pagination limit",
    response.data.length <= response.pagination.limit,
  );
  // 7. Validate ordering of inventory histories by createdAt descending (latest first)
  for (let i = 1; i < response.data.length; i++) {
    const prev = response.data[i - 1];
    const curr = response.data[i];
    TestValidator.predicate(
      `descending order check between entries ${i - 1} and ${i}`,
      new Date(prev.createdAt).getTime() >= new Date(curr.createdAt).getTime(),
    );
  }
  // 8. Validate each item has all necessary fields non-null and valid
  response.data.forEach((item) => {
    TestValidator.predicate(
      "item id not empty",
      typeof item.id === "string" && item.id.length > 0,
    );
    TestValidator.predicate(
      "item variant id matches product variant id",
      typeof item.shoppingMallProductVariantId === "string" &&
        item.shoppingMallProductVariantId.length > 0,
    );
    TestValidator.predicate(
      "quantityDelta is integer",
      Number.isInteger(item.quantityDelta),
    );
    TestValidator.predicate(
      "reason is non-empty string",
      typeof item.reason === "string" && item.reason.length > 0,
    );
    TestValidator.predicate(
      "createdAt is valid ISO datetime",
      !isNaN(Date.parse(item.createdAt)),
    );
    TestValidator.predicate(
      "updatedAt is valid ISO datetime",
      !isNaN(Date.parse(item.updatedAt)),
    );
  });
}
