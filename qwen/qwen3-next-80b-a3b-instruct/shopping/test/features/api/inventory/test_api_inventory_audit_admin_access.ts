import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_audit_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Generate random product variant for inventory records
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // Create inventory records with different sources
  // Since we cannot directly create inventory records, we rely on the admin endpoint
  // to retrieve them. We'll test with comprehensive filtering.
  // Test basic inventory records retrieval with no filters
  const result1 =
    await api.functional.shoppingMall.admin.inventory.records.index(
      adminConnection,
      {
        body: {
          variantId: variantId,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(result1);
  TestValidator.equals(
    "response has data array",
    result1.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "response has pagination",
    result1.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "response has records",
    result1.pagination.records >= 0,
    true,
  );
  // Test filtering by sourceType
  const sourceTypes: IShoppingMallInventoryRecord.IRequest["sourceType"][] = [
    "order_placement",
    "order_cancellation",
    "order_refund",
    "restock",
    "adjustment",
  ];
  for (const sourceType of sourceTypes) {
    const result2 =
      await api.functional.shoppingMall.admin.inventory.records.index(
        adminConnection,
        {
          body: {
            sourceType: sourceType,
            pageSize: 5,
          } satisfies IShoppingMallInventoryRecord.IRequest,
        },
      );
    typia.assert(result2);
    TestValidator.predicate("sourceType filter works", () =>
      result2.data.every((record) => record.sourceType === sourceType),
    );
  }
  // Test filtering by reason text
  const reasonText = "restock";
  const result3 =
    await api.functional.shoppingMall.admin.inventory.records.index(
      adminConnection,
      {
        body: {
          reason: reasonText,
          pageSize: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(result3);
  TestValidator.predicate("reason text filter works", () =>
    result3.data.every((record) =>
      record.reason.toLowerCase().includes(reasonText.toLowerCase()),
    ),
  );
  // Test filtering by date range
  const now = new Date();
  const startDate = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = now.toISOString();
  const result4 =
    await api.functional.shoppingMall.admin.inventory.records.index(
      adminConnection,
      {
        body: {
          startDate: startDate,
          endDate: endDate,
          pageSize: 20,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(result4);
  TestValidator.predicate("date range filter works", () =>
    result4.data.every((record) => {
      const recordDate = new Date(record.createdAt);
      return (
        recordDate >= new Date(startDate) && recordDate <= new Date(endDate)
      );
    }),
  );
  // Test sorting by createdAt
  const result5 =
    await api.functional.shoppingMall.admin.inventory.records.index(
      adminConnection,
      {
        body: {
          sortBy: "created_at",
          pageSize: 15,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(result5);
  TestValidator.predicate("sort by createdAt works", () => {
    if (result5.data.length <= 1) return true;
    for (let i = 1; i < result5.data.length; i++) {
      const prevDate = new Date(result5.data[i - 1].createdAt);
      const currDate = new Date(result5.data[i].createdAt);
      if (prevDate > currDate) return false;
    }
    return true;
  });
  // Test pagination with cursor
  if (result5.data.length > 0) {
    const cursor = result5.data[result5.data.length - 1].variantId;
    const result6 =
      await api.functional.shoppingMall.admin.inventory.records.index(
        adminConnection,
        {
          body: {
            cursor: cursor,
            pageSize: 5,
          } satisfies IShoppingMallInventoryRecord.IRequest,
        },
      );
    typia.assert(result6);
    TestValidator.equals(
      "pagination has consistent records",
      result6.data.length <= 5,
      true,
    );
    TestValidator.equals(
      "pagination has current page",
      result6.pagination.current > 1,
      true,
    );
  }
}
