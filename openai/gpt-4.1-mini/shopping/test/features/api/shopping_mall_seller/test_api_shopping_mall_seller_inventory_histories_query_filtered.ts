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

export async function test_api_shopping_mall_seller_inventory_histories_query_filtered(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario validates filtering inventory history records by a reason substring and date range,
  // ensuring that the API correctly applies all filters simultaneously. It verifies that only inventory
  // history entries containing the reason substring in their reason field and created during the specified
  // date range are returned. It also checks pagination correctness.
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(connection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = sellerAuth.token.access;
  // 2. Prepare a product variant ID for querying inventory histories (random uuid)
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare date range for filtering (from 30 days ago to now)
  const now = new Date();
  const dateFrom = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateTo = now.toISOString();
  // 4. Reason substring filter
  const reasonSubstring = "restock";
  // 5. Build the query body
  const body: IShoppingMallInventoryHistory.IRequest = {
    reason: reasonSubstring,
    interval: {
      from: dateFrom,
      to: dateTo,
    },
    page: {
      current: 1,
      limit: 20,
    },
  } satisfies IShoppingMallInventoryHistory.IRequest;
  // 6. Perform the query
  const output: IPageIShoppingMallInventoryHistory.ISummary =
    await api.functional.shoppingMall.seller.productVariants.inventoryHistories.index(
      sellerConnection,
      {
        variantId: variantId,
        body: body,
      },
    );
  typia.assert(output);
  // 7. We cannot validate item properties because they do not exist in DTO
  // so we skip detailed per-item property assertions
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page correct",
    output.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit correct",
    output.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination pages correct",
    output.pagination.pages ===
      (output.pagination.records === 0
        ? 0
        : Math.ceil(output.pagination.records / output.pagination.limit)),
  );
  TestValidator.predicate(
    "pagination records not less than data length",
    output.pagination.records >= output.data.length,
  );
  // 9. Verify unauthorized access is rejected properly
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access", 401, async () => {
    await api.functional.shoppingMall.seller.productVariants.inventoryHistories.index(
      unauthorizedConnection,
      {
        variantId: variantId,
        body: body,
      },
    );
  });
}
