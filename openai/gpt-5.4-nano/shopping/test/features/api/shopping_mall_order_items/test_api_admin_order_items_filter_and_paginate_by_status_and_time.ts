import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_items_filter_and_paginate_by_status_and_time(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  const windowTo = new Date();
  const windowFrom = new Date(windowTo.getTime() - 1000 * 60 * 60 * 24 * 30);
  // First, fetch any data to discover an existing line_item_status and sane time range.
  const discoverPage =
    await api.functional.shoppingMall.admin.admin.order_items.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "placed_at",
          sortDirection: "desc",
          placedAtFrom: windowFrom.toISOString(),
          placedAtTo: windowTo.toISOString(),
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(discoverPage);
  const discoveredStatus: string | undefined =
    discoverPage.data[0]?.line_item_status;
  // If the database is empty, the endpoint can still return a valid empty page.
  // Then we only validate pagination consistency.
  if (discoverPage.data.length === 0 || !discoveredStatus) {
    TestValidator.equals(
      "discover pagination records 0",
      discoverPage.pagination.records,
      0,
    );
    TestValidator.equals(
      "discover pagination pages 0",
      discoverPage.pagination.pages,
      0,
    );
    return;
  }
  const lineItemStatus = discoveredStatus;
  const page = await api.functional.shoppingMall.admin.admin.order_items.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        lineItemStatus,
        sortBy: "placed_at",
        sortDirection: "desc",
        placedAtFrom: windowFrom.toISOString(),
        placedAtTo: windowTo.toISOString(),
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(page);
  const { pagination, data } = page;
  const expectedPages =
    pagination.limit === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pagination.pages consistent",
    pagination.pages,
    expectedPages,
  );
  TestValidator.predicate("all items match line_item_status", () =>
    data.every((x) => x.line_item_status === lineItemStatus),
  );
  const timeFrom = windowFrom.getTime();
  const timeTo = windowTo.getTime();
  TestValidator.predicate("all items placed_at in window", () =>
    data.every((x) => {
      const t = new Date(x.placed_at).getTime();
      return t >= timeFrom && t <= timeTo;
    }),
  );
  if (data.length >= 2) {
    for (let i = 0; i < data.length - 1; i++) {
      const a = new Date(data[i].placed_at).getTime();
      const b = new Date(data[i + 1].placed_at).getTime();
      TestValidator.predicate(
        `sorted by placed_at desc at index ${i}`,
        () => a >= b,
      );
    }
  }
  // Negative business coverage (avoid HTTP 400): use a more restrictive window.
  // Do not assert strict zero matches (can be flaky in shared environments).
  const narrowFrom = new Date(windowTo.getTime() - 1000 * 60 * 5);
  const narrowTo = windowTo;
  const restrictivePage =
    await api.functional.shoppingMall.admin.admin.order_items.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          lineItemStatus,
          sortBy: "placed_at",
          sortDirection: "desc",
          placedAtFrom: narrowFrom.toISOString(),
          placedAtTo: narrowTo.toISOString(),
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(restrictivePage);
  TestValidator.predicate("restrictive response matches requested status", () =>
    restrictivePage.data.every((x) => x.line_item_status === lineItemStatus),
  );
  const narrowFromMs = narrowFrom.getTime();
  const narrowToMs = narrowTo.getTime();
  TestValidator.predicate(
    "restrictive response placed_at in narrower window",
    () =>
      restrictivePage.data.every((x) => {
        const t = new Date(x.placed_at).getTime();
        return t >= narrowFromMs && t <= narrowToMs;
      }),
  );
}
