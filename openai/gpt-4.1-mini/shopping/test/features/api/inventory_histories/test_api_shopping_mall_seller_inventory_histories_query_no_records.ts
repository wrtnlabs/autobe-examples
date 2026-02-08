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

export async function test_api_shopping_mall_seller_inventory_histories_query_no_records(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new seller by joining
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {}, // IShoppingMallSeller.IJoin is empty object
  });
  // authorize_seller_join utility updates headers internally, no manual overwrite
  // 2. Create or identify a product variant with no inventory history.
  // Since no product variant creation API is given, use a random UUID for variantId
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // 3. Query inventory histories for the variant
  const output =
    await api.functional.shoppingMall.seller.productVariants.inventoryHistories.index(
      sellerConnection,
      {
        variantId,
        body: {}, // IShoppingMallInventoryHistory.IRequest is empty object
      },
    );
  typia.assert(output);
  // 4. Validate that the returned data array is empty and pagination metadata reflects zero records
  TestValidator.equals("data array empty", output.data.length, 0);
  TestValidator.equals("pagination records zero", output.pagination.records, 0);
  TestValidator.equals("pagination pages zero", output.pagination.pages, 0);
  TestValidator.equals(
    "pagination current is one",
    output.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    output.pagination.limit > 0,
  );
}
