import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_product_snapshots_filter_by_product_and_created_at_window(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234" satisfies string & tags.Format<"password">,
  } satisfies IShoppingMallAdmin.IJoin;
  const authorized = await api.functional.shoppingMall.auth.admin.join(
    adminConnection,
    {
      body: credentials,
    },
  );
  typia.assert(authorized);
  // 2) Baseline query
  const baseline =
    await api.functional.shoppingMall.admin.productSnapshots.search(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(baseline);
  TestValidator.predicate(
    "baseline should return at least one snapshot to test filtering",
    () => baseline.data.length > 0,
  );
  const selected = typia.assert(
    baseline.data[0],
  ) satisfies IShoppingMallProductSnapshot.ISummary;
  const selectedProductId = selected.shopping_mall_product_id;
  const selectedCreatedAt = selected.created_at;
  // 4) Filter by productId + created_at window (inclusive, exact match)
  const createdAtFrom = selectedCreatedAt;
  const createdAtTo = selectedCreatedAt;
  const filtered =
    await api.functional.shoppingMall.admin.productSnapshots.search(
      adminConnection,
      {
        body: {
          productId: selectedProductId,
          createdAtFrom,
          createdAtTo,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(filtered);
  TestValidator.predicate("all filtered items must match productId", () =>
    filtered.data.every(
      (item) => item.shopping_mall_product_id === selectedProductId,
    ),
  );
  const fromMs = new Date(createdAtFrom).getTime();
  const toMs = new Date(createdAtTo).getTime();
  TestValidator.predicate(
    "all filtered items must have created_at inside inclusive window",
    () =>
      filtered.data.every((item) => {
        const t = new Date(item.created_at).getTime();
        return t >= fromMs && t <= toMs;
      }),
  );
  TestValidator.equals(
    "pagination current page",
    filtered.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is at least the request limit or clamped consistently",
    () =>
      filtered.pagination.limit >= 0 &&
      filtered.data.length <= filtered.pagination.limit,
  );
  TestValidator.predicate(
    "data size does not exceed request limit",
    () => filtered.data.length <= 10,
  );
  // 6) Exclude by creating a zero-width window just after selectedCreatedAt.
  // This excludes selectedCreatedAt itself while aiming to avoid other records.
  const excludedAt = new Date(fromMs + 1).toISOString();
  const excluded =
    await api.functional.shoppingMall.admin.productSnapshots.search(
      adminConnection,
      {
        body: {
          productId: selectedProductId,
          createdAtFrom: excludedAt,
          createdAtTo: excludedAt,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(excluded);
  TestValidator.equals(
    "excluded window returns empty",
    excluded.data.length,
    0,
  );
}
