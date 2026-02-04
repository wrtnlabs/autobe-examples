import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_inventory_metrics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller connection and authenticate with existing seller credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_login(sellerConnection, {
      body: {
        email: "seller@example.com",
        password: "SecurePassword123!",
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(sellerAuth);
  // Step 2: Use seller connection to retrieve inventory metrics
  const metrics: IPageIShoppingMallInventoryRecord.ISummary =
    await api.functional.shoppingMall.seller.inventory.metrics.index(
      sellerConnection,
    );
  // Step 3: Validate response structure conforms to expected schema
  typia.assert(metrics);
  // Step 4: Validate pagination properties
  TestValidator.equals(
    "pagination current page is 1",
    metrics.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    metrics.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    metrics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    metrics.pagination.pages >= 0,
  );
  // Step 5: Validate data array exists and is an array
  TestValidator.predicate("data array exists", Array.isArray(metrics.data));
  // Step 6: Validate that all inventory records in data array conform to ISummary type
  // Note: typia.assert() already validates the structure, but we verify array existence
  for (const record of metrics.data) {
    typia.assert<IShoppingMallInventoryRecord.ISummary>(record);
  }
}
