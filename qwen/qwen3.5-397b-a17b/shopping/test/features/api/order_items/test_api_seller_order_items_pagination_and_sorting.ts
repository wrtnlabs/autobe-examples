import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_order_items_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication via join
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerAuth);
  // 2. Create seller-specific connection with authenticated token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 3. Test pagination with page=1, limit=10, sort by createdAt descending
  const page1Result: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "createdAt,desc",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(page1Result);
  // 4. Validate pagination metadata for page 1
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 records count non-negative",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages count non-negative",
    page1Result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page 1 data array length within limit",
    page1Result.data.length <= 10,
  );
  // 5. Validate data structure for each order item on page 1
  for (const item of page1Result.data) {
    typia.assert(item);
  }
  // 6. Verify createdAt descending order on page 1
  if (page1Result.data.length > 1) {
    for (let i = 1; i < page1Result.data.length; i++) {
      const prevDate = new Date(page1Result.data[i - 1].created_at).getTime();
      const currDate = new Date(page1Result.data[i].created_at).getTime();
      TestValidator.predicate(
        `item ${i} createdAt <= item ${i - 1} createdAt (descending)`,
        currDate <= prevDate,
      );
    }
  }
  // 7. Test page 2 if there are enough records
  if (page1Result.pagination.pages > 1) {
    const page2Result: IPageIShoppingMallOrderItem.ISummary =
      await api.functional.shoppingMall.seller.order_items.index(
        sellerConnection,
        {
          body: {
            page: 2,
            limit: 10,
            sort: "createdAt,desc",
          } satisfies IShoppingMallOrderItem.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "page 2 current page",
      page2Result.pagination.current,
      2,
    );
    TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
    TestValidator.equals(
      "page 2 records matches page 1",
      page2Result.pagination.records,
      page1Result.pagination.records,
    );
    TestValidator.equals(
      "page 2 pages matches page 1",
      page2Result.pagination.pages,
      page1Result.pagination.pages,
    );
    TestValidator.predicate(
      "page 2 data array length within limit",
      page2Result.data.length <= 10,
    );
    // Verify page 2 items are also sorted by createdAt descending
    if (page2Result.data.length > 1) {
      for (let i = 1; i < page2Result.data.length; i++) {
        const prevDate = new Date(page2Result.data[i - 1].created_at).getTime();
        const currDate = new Date(page2Result.data[i].created_at).getTime();
        TestValidator.predicate(
          `page 2 item ${i} createdAt <= item ${i - 1} createdAt (descending)`,
          currDate <= prevDate,
        );
      }
    }
    // Verify last item on page 1 has createdAt >= first item on page 2
    if (page1Result.data.length > 0 && page2Result.data.length > 0) {
      const lastPage1Date = new Date(
        page1Result.data[page1Result.data.length - 1].created_at,
      ).getTime();
      const firstPage2Date = new Date(page2Result.data[0].created_at).getTime();
      TestValidator.predicate(
        "page 1 last item >= page 2 first item (descending order across pages)",
        lastPage1Date >= firstPage2Date,
      );
    }
  }
  // 8. Test alternative sort order: status ascending
  const statusAscResult: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "status,asc",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(statusAscResult);
  TestValidator.equals(
    "status asc current page",
    statusAscResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "status asc limit",
    statusAscResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "status asc records matches createdAt desc",
    statusAscResult.pagination.records,
    page1Result.pagination.records,
  );
  // Verify status ascending order
  if (statusAscResult.data.length > 1) {
    const statusOrder = [
      "CANCELLED",
      "DELIVERED",
      "PAID",
      "REFUNDED",
      "SHIPPED",
    ];
    for (let i = 1; i < statusAscResult.data.length; i++) {
      const prevStatus = statusAscResult.data[i - 1].status;
      const currStatus = statusAscResult.data[i].status;
      const prevIndex = statusOrder.indexOf(prevStatus);
      const currIndex = statusOrder.indexOf(currStatus);
      TestValidator.predicate(
        `item ${i} status >= item ${i - 1} status (ascending)`,
        currIndex >= prevIndex,
      );
    }
  }
  // 9. Test alternative sort order: status descending
  const statusDescResult: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "status,desc",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(statusDescResult);
  TestValidator.equals(
    "status desc current page",
    statusDescResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "status desc limit",
    statusDescResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "status desc records matches other sorts",
    statusDescResult.pagination.records,
    page1Result.pagination.records,
  );
  // Verify status descending order
  if (statusDescResult.data.length > 1) {
    const statusOrder = [
      "CANCELLED",
      "DELIVERED",
      "PAID",
      "REFUNDED",
      "SHIPPED",
    ];
    for (let i = 1; i < statusDescResult.data.length; i++) {
      const prevStatus = statusDescResult.data[i - 1].status;
      const currStatus = statusDescResult.data[i].status;
      const prevIndex = statusOrder.indexOf(prevStatus);
      const currIndex = statusOrder.indexOf(currStatus);
      TestValidator.predicate(
        `item ${i} status <= item ${i - 1} status (descending)`,
        currIndex <= prevIndex,
      );
    }
  }
  // 10. Test pagination with different limit values
  const limit20Result: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "createdAt,desc",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(limit20Result);
  TestValidator.equals(
    "limit 20 current page",
    limit20Result.pagination.current,
    1,
  );
  TestValidator.equals("limit 20 limit", limit20Result.pagination.limit, 20);
  TestValidator.equals(
    "limit 20 records matches limit 10",
    limit20Result.pagination.records,
    page1Result.pagination.records,
  );
  TestValidator.predicate(
    "limit 20 data array length within new limit",
    limit20Result.data.length <= 20,
  );
  // 11. Verify all order items belong to this seller (authorization check)
  for (const item of page1Result.data) {
    TestValidator.equals(
      "order item seller matches authenticated seller",
      item.seller.id,
      sellerAuth.id,
    );
  }
}
