import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_snapshot_history_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const page1 = await api.functional.shoppingMall.admin.snapshots.history(
    adminConnection,
    {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IShoppingMallSnapshot.IRequest,
    },
  );
  typia.assert(page1);
  // Scenario A — ordering: created_at desc (non-increasing)
  for (let i = 1; i < page1.data.length; ++i) {
    const prev = page1.data[i - 1];
    const curr = page1.data[i];
    TestValidator.predicate(
      `scenario A created_at non-increasing at index ${i}`,
      new Date(curr.created_at).getTime() <=
        new Date(prev.created_at).getTime(),
    );
  }
  // Scenario B — filter by an existing order-item linkage context
  let chosen = page1.data.find((r) => r.source_order_item_id !== null);
  if (!chosen) {
    const page2 = await api.functional.shoppingMall.admin.snapshots.history(
      adminConnection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingMallSnapshot.IRequest,
      },
    );
    typia.assert(page2);
    chosen = page2.data.find((r) => r.source_order_item_id !== null);
    if (!chosen) {
      await TestValidator.error(
        "scenario B requires at least one snapshot with source_order_item_id in current environment",
        () => {
          throw new Error("No snapshot with source_order_item_id found");
        },
      );
      return;
    }
  }
  const sourceType = chosen.source_type;
  const sourceOrderItemId =
    chosen.source_order_item_id ?? undefined;

  const filtered = await api.functional.shoppingMall.admin.snapshots.history(
    adminConnection,
    {
      body: {
        sourceType,
        sourceOrderItemId,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IShoppingMallSnapshot.IRequest,
    },
  );
  typia.assert(filtered);
  for (let i = 0; i < filtered.data.length; ++i) {
    const r = filtered.data[i];
    TestValidator.equals(
      `scenario B source_type match at ${i}`,
      r.source_type,
      sourceType,
    );
    TestValidator.equals(
      `scenario B source_order_item_id match at ${i}`,
      r.source_order_item_id,
      chosen.source_order_item_id,
    );
    if (i > 0) {
      const prev = filtered.data[i - 1];
      TestValidator.predicate(
        `scenario B created_at non-increasing at index ${i}`,
        new Date(r.created_at).getTime() <= new Date(prev.created_at).getTime(),
      );
    }
  }
  // Scenario C — filters yield no results
  const unlikelyType = `no-match-${RandomGenerator.alphabets(10)}-${RandomGenerator.alphabets(8)}`;
  const unlikelyId = typia.random<string & tags.Format<"uuid">>();
  const empty = await api.functional.shoppingMall.admin.snapshots.history(
    adminConnection,
    {
      body: {
        sourceType: unlikelyType,
        sourceOrderItemId: unlikelyId,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IShoppingMallSnapshot.IRequest,
    },
  );
  typia.assert(empty);
  TestValidator.equals("scenario C empty data", empty.data.length, 0);
  TestValidator.equals(
    "scenario C pagination.records",
    empty.pagination.records,
    0,
  );
  TestValidator.equals(
    "scenario C pagination.pages",
    empty.pagination.pages,
    0,
  );
}
