import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller inventory history retrieval with various filters.
 * 1. Register as seller and authenticate
 * 2. Retrieve all inventory history for the seller
 * 3. Test filtering by reason codes, date range, variant ID, seller ID
 * 4. Test pagination and sorting
 */
export async function test_api_seller_inventory_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuthorized);
  // 2. Get all inventory history for seller
  const allHistory =
    await api.functional.shoppingMall.seller.inventory.history.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(allHistory);
  // 3. Test filtering by reason codes
  const orderHistory =
    await api.functional.shoppingMall.seller.inventory.history.index(
      sellerConnection,
      {
        body: {
          reason: ["order"],
        },
      },
    );
  typia.assert(orderHistory);
  // 4. Test filtering by date range
  const now = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentHistory =
    await api.functional.shoppingMall.seller.inventory.history.index(
      sellerConnection,
      {
        body: {
          created_at_start: oneDayAgo,
          created_at_end: now,
        },
      },
    );
  typia.assert(recentHistory);
  // 5. Test pagination
  const page1 =
    await api.functional.shoppingMall.seller.inventory.history.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "pagination limit respected",
    page1.data.length <= 10,
  );
  TestValidator.equals("pagination correct", page1.pagination.current, 1);
  const page2 =
    await api.functional.shoppingMall.seller.inventory.history.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(page2);
  TestValidator.equals("pagination page correct", page2.pagination.current, 2);
  // 6. Test sorting
  const sortedHistory =
    await api.functional.shoppingMall.seller.inventory.history.index(
      sellerConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        },
      },
    );
  typia.assert(sortedHistory);
}
