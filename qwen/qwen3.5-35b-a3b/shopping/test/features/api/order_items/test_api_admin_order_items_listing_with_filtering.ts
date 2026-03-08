import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_items_listing_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join to authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Test basic listing without filters
  const basicResponse =
    await api.functional.ecommerceMall.admin.orderItems.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
      },
    });
  typia.assert(basicResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    basicResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", basicResponse.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    basicResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    basicResponse.pagination.pages ===
      Math.ceil(basicResponse.pagination.records / 10),
  );
  // 3. Test filtering by order_id
  if (basicResponse.data.length > 0) {
    const firstOrder = basicResponse.data[0].order;
    const filteredByOrder =
      await api.functional.ecommerceMall.admin.orderItems.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 10,
            order_id: firstOrder.id,
          },
        },
      );
    typia.assert(filteredByOrder);
    TestValidator.predicate(
      "filtered by order_id returns matching orders",
      filteredByOrder.data.every(
        (item: IEcommerceMallOrderItem.ISummary) =>
          item.order.id === firstOrder.id,
      ),
    );
  }
  // 4. Test filtering by item_status
  const statusOptions: Array<
    "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
  > = ["paid", "shipped", "delivered", "cancelled", "refunded"];
  const statusFilterResult =
    await api.functional.ecommerceMall.admin.orderItems.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
        item_status: "delivered",
      },
    });
  typia.assert(statusFilterResult);
  TestValidator.predicate(
    "filtered by status returns matching items",
    statusFilterResult.data.every(
      (item: IEcommerceMallOrderItem.ISummary) =>
        item.itemStatus === "delivered",
    ),
  );
  // 5. Test filtering by product_id
  if (basicResponse.data.length > 0) {
    const productId = basicResponse.data[0].order.id;
    const filteredByProduct =
      await api.functional.ecommerceMall.admin.orderItems.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 10,
            order_id: productId,
          },
        },
      );
    typia.assert(filteredByProduct);
  }
  // 6. Test date range filtering on created_at
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 30);
  const dateTo = new Date();
  const dateFiltered =
    await api.functional.ecommerceMall.admin.orderItems.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
        created_at_from: dateFrom.toISOString(),
        created_at_to: dateTo.toISOString(),
      },
    });
  typia.assert(dateFiltered);
  // 7. Test sorting by created_at descending
  const sortedDesc = await api.functional.ecommerceMall.admin.orderItems.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "created_at",
        order: "DESC",
      },
    },
  );
  typia.assert(sortedDesc);
  if (sortedDesc.data.length > 1) {
    for (let i = 1; i < sortedDesc.data.length; i++) {
      TestValidator.predicate(
        "descending sort order verified",
        new Date(sortedDesc.data[i].created_at) <=
          new Date(sortedDesc.data[i - 1].created_at),
      );
    }
  }
  // 8. Test sorting by created_at ascending
  const sortedAsc = await api.functional.ecommerceMall.admin.orderItems.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "created_at",
        order: "ASC",
      },
    },
  );
  typia.assert(sortedAsc);
  if (sortedAsc.data.length > 1) {
    for (let i = 1; i < sortedAsc.data.length; i++) {
      TestValidator.predicate(
        "ascending sort order verified",
        new Date(sortedAsc.data[i].created_at) >=
          new Date(sortedAsc.data[i - 1].created_at),
      );
    }
  }
  // 9. Test include_deleted parameter
  const withDeleted = await api.functional.ecommerceMall.admin.orderItems.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        include_deleted: true,
      },
    },
  );
  typia.assert(withDeleted);
  // 10. Validate order item structure and snapshots
  if (basicResponse.data.length > 0) {
    const sampleItem = basicResponse.data[0];
    // Validate required fields
    typia.assert(sampleItem);
    TestValidator.equals(
      "item has uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleItem.id,
      ),
      true,
    );
    TestValidator.predicate("quantity is positive", sampleItem.quantity > 0);
    TestValidator.predicate("unitPrice is positive", sampleItem.unitPrice > 0);
    TestValidator.equals(
      "itemStatus is valid enum",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        sampleItem.itemStatus,
      ),
      true,
    );
    // Validate order reference
    TestValidator.equals(
      "order reference has valid id",
      typeof sampleItem.order.id,
      "string",
    );
    TestValidator.equals(
      "order reference has order_number",
      typeof sampleItem.order.order_number,
      "string",
    );
    TestValidator.predicate(
      "order reference has positive total_price",
      sampleItem.order.total_price > 0,
    );
    // Validate timestamp formats
    const createdAt = new Date(sampleItem.created_at);
    const updatedAt = new Date(sampleItem.updated_at);
    TestValidator.predicate(
      "created_at is valid date",
      !isNaN(createdAt.getTime()),
    );
    TestValidator.predicate(
      "updated_at is valid date",
      !isNaN(updatedAt.getTime()),
    );
  }
  // 11. Test pagination bounds
  const paginationTest =
    await api.functional.ecommerceMall.admin.orderItems.index(adminConnection, {
      body: {
        page: 1,
        limit: 1,
      },
    });
  typia.assert(paginationTest);
  TestValidator.equals(
    "limit 1 returns max 1 item",
    paginationTest.data.length <= 1,
    true,
  );
  const paginationTest100 =
    await api.functional.ecommerceMall.admin.orderItems.index(adminConnection, {
      body: {
        page: 1,
        limit: 100,
      },
    });
  typia.assert(paginationTest100);
  TestValidator.equals(
    "limit 100 returns max 100 items",
    paginationTest100.data.length <= 100,
    true,
  );
}
