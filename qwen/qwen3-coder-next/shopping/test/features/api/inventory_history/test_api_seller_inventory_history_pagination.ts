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
import { generate_random_shopping_mall_seller_inventory_histories_create } from "../../../generate/generate_random_shopping_mall_seller_inventory_histories_create";
import { prepare_random_shopping_mall_inventory_history } from "../../../prepare/prepare_random_shopping_mall_inventory_history";

export async function test_api_seller_inventory_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create multiple inventory history records for testing pagination
  // Create 15 records to ensure we have data beyond the default limit of 10
  const inventoryHistories: IShoppingMallInventoryHistory[] = [];
  // Create 15 inventory history records
  for (let i = 0; i < 15; i++) {
    const history =
      await generate_random_shopping_mall_seller_inventory_histories_create(
        sellerConnection,
        {
          body: {
            variant_id: typia.random<string & tags.Format<"uuid">>(),
            quantity_change: Math.random() > 0.5 ? 10 : -5,
            reason:
              i % 3 === 0 ? "restock" : i % 3 === 1 ? "order" : "adjustment",
            metadata: i % 2 === 0 ? null : JSON.stringify({ source: "manual" }),
          } satisfies IShoppingMallInventoryHistory.ICreate,
        },
      );
    typia.assert(history);
    inventoryHistories.push(history);
  }
  // 3. Test default pagination (page=1, limit=10)
  const defaultPage =
    await api.functional.shoppingMall.seller.inventory.history.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultPage);
  // Validate default pagination metadata
  TestValidator.equals("default page is 1", defaultPage.pagination.current, 1);
  TestValidator.equals("default limit is 10", defaultPage.pagination.limit, 10);
  TestValidator.equals(
    "total records is 15",
    defaultPage.pagination.records,
    15,
  );
  TestValidator.equals("total pages is 2", defaultPage.pagination.pages, 2);
  TestValidator.equals(
    "first page has 10 records",
    defaultPage.data.length,
    10,
  );
  // 4. Test navigation to next page (page=2)
  const secondPage =
    await api.functional.shoppingMall.seller.inventory.history.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(secondPage);
  // Validate second page
  TestValidator.equals(
    "second page number is 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals("second page has 5 records", secondPage.data.length, 5);
  // 7. Test with custom limit
  const customLimitPage =
    await api.functional.shoppingMall.seller.inventory.history.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(customLimitPage);
  // Validate custom pagination
  TestValidator.equals(
    "custom limit is 5",
    customLimitPage.pagination.limit,
    5,
  );
  TestValidator.equals(
    "custom page has 5 records",
    customLimitPage.data.length,
    5,
  );
  TestValidator.equals(
    "custom total pages is 3 (15/5=3)",
    customLimitPage.pagination.pages,
    3,
  );
}
