import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_order_items_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdmin);
  // 2. Test default pagination (limit=20)
  const defaultPage =
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      superAdminConnection,
      { body: {} },
    );
  typia.assert(defaultPage);
  TestValidator.equals("default limit is 20", defaultPage.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    defaultPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "current page is valid",
    defaultPage.pagination.current >= 1,
  );
  // 3. Test custom limit values (10, 50, 100)
  const limit10 =
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      superAdminConnection,
      { body: { limit: 10 } },
    );
  typia.assert(limit10);
  TestValidator.equals("limit 10 enforced", limit10.pagination.limit, 10);
  const limit50 =
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      superAdminConnection,
      { body: { limit: 50 } },
    );
  typia.assert(limit50);
  TestValidator.equals("limit 50 enforced", limit50.pagination.limit, 50);
  const limit100 =
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      superAdminConnection,
      { body: { limit: 100 } },
    );
  typia.assert(limit100);
  TestValidator.equals("limit 100 enforced", limit100.pagination.limit, 100);
  // 4. Test invalid limit (< 1)
  await TestValidator.error("invalid limit 0 rejected", async () => {
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      superAdminConnection,
      { body: { limit: 0 } },
    );
  });
  // 5. Test invalid limit (> 100)
  await TestValidator.error("invalid limit 101 rejected", async () => {
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      superAdminConnection,
      { body: { limit: 101 } },
    );
  });
  // 6. Test sorting by created_at DESC
  const createdAtDesc =
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      superAdminConnection,
      { body: { order_by: "created_at", order_direction: "DESC" } },
    );
  typia.assert(createdAtDesc);
  if (createdAtDesc.data.length > 1) {
    const firstDate = new Date(createdAtDesc.data[0].created_at).getTime();
    const lastDate = new Date(
      createdAtDesc.data[createdAtDesc.data.length - 1].created_at,
    ).getTime();
    TestValidator.predicate(
      "created_at DESC order correct",
      firstDate >= lastDate,
    );
  }
  // 7. Test sorting by created_at ASC
  const createdAtAsc =
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      superAdminConnection,
      { body: { order_by: "created_at", order_direction: "ASC" } },
    );
  typia.assert(createdAtAsc);
  if (createdAtAsc.data.length > 1) {
    const firstDate = new Date(createdAtAsc.data[0].created_at).getTime();
    const lastDate = new Date(
      createdAtAsc.data[createdAtAsc.data.length - 1].created_at,
    ).getTime();
    TestValidator.predicate(
      "created_at ASC order correct",
      firstDate <= lastDate,
    );
  }
  // 8. Test sorting by quantity DESC
  const quantityDesc =
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      superAdminConnection,
      { body: { order_by: "quantity", order_direction: "DESC" } },
    );
  typia.assert(quantityDesc);
  if (quantityDesc.data.length > 1) {
    const firstQty = quantityDesc.data[0].quantity;
    const lastQty = quantityDesc.data[quantityDesc.data.length - 1].quantity;
    TestValidator.predicate("quantity DESC order correct", firstQty >= lastQty);
  }
  // 9. Test sorting by quantity ASC
  const quantityAsc =
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      superAdminConnection,
      { body: { order_by: "quantity", order_direction: "ASC" } },
    );
  typia.assert(quantityAsc);
  if (quantityAsc.data.length > 1) {
    const firstQty = quantityAsc.data[0].quantity;
    const lastQty = quantityAsc.data[quantityAsc.data.length - 1].quantity;
    TestValidator.predicate("quantity ASC order correct", firstQty <= lastQty);
  }
  // 10. Test sorting by unit_price DESC
  const unitPriceDesc =
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      superAdminConnection,
      { body: { order_by: "unit_price", order_direction: "DESC" } },
    );
  typia.assert(unitPriceDesc);
  if (unitPriceDesc.data.length > 1) {
    const firstPrice = unitPriceDesc.data[0].unit_price;
    const lastPrice =
      unitPriceDesc.data[unitPriceDesc.data.length - 1].unit_price;
    TestValidator.predicate(
      "unit_price DESC order correct",
      firstPrice >= lastPrice,
    );
  }
  // 11. Test sorting by unit_price ASC
  const unitPriceAsc =
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      superAdminConnection,
      { body: { order_by: "unit_price", order_direction: "ASC" } },
    );
  typia.assert(unitPriceAsc);
  if (unitPriceAsc.data.length > 1) {
    const firstPrice = unitPriceAsc.data[0].unit_price;
    const lastPrice =
      unitPriceAsc.data[unitPriceAsc.data.length - 1].unit_price;
    TestValidator.predicate(
      "unit_price ASC order correct",
      firstPrice <= lastPrice,
    );
  }
  // 12. Test cursor-based pagination
  if (defaultPage.pagination.current < defaultPage.pagination.pages) {
    const next =
      await api.functional.ecommerceMall.superAdministrator.order_items.index(
        superAdminConnection,
        { body: { page: "next" } },
      );
    typia.assert(next);
    TestValidator.predicate(
      "page navigation works",
      next.pagination.current > 0,
    );
  }
  // 13. Test with status filter
  const filteredPage =
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      superAdminConnection,
      { body: { status: "paid" } },
    );
  typia.assert(filteredPage);
  for (const item of filteredPage.data) {
    TestValidator.equals("item status is paid", item.status, "paid");
  }
  // 14. Verify data structure consistency
  for (const item of defaultPage.data) {
    TestValidator.predicate(
      "item ID is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.id,
      ),
    );
    TestValidator.predicate(
      "item has order number",
      item.order_number.length > 0,
    );
    TestValidator.predicate("item quantity is at least 1", item.quantity >= 1);
    TestValidator.predicate("item unit_price is positive", item.unit_price > 0);
    TestValidator.predicate(
      "item created_at is valid ISO date",
      !isNaN(new Date(item.created_at).getTime()),
    );
  }
  // 15. Test pagination metadata accuracy
  TestValidator.equals(
    "pages calculation correct",
    defaultPage.pagination.pages,
    Math.ceil(defaultPage.pagination.records / defaultPage.pagination.limit),
  );
}
