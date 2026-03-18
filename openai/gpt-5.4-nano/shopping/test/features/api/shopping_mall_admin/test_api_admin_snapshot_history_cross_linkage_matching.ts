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

export async function test_api_admin_snapshot_history_cross_linkage_matching(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin join/auth
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2) Discover existing snapshot linkage with broad query
  const broadResponse: IPageIShoppingMallSnapshot.ISummary =
    await api.functional.shoppingMall.admin.snapshots.history(adminConnection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSnapshot.IRequest,
    });
  typia.assert(broadResponse);
  TestValidator.predicate(
    "should have at least one snapshot entry",
    () => broadResponse.data.length > 0,
  );
  const selected = broadResponse.data.find(
    (item) =>
      item.source_order_id !== null && item.source_order_item_id !== null,
  );
  if (!selected) {
    throw new Error(
      "No snapshot entry found with both source_order_id and source_order_item_id",
    );
  }
  const sourceType = selected.source_type;
  const sourceOrderId = selected.source_order_id;
  const sourceOrderItemId = selected.source_order_item_id;
  // 3) Main call with cross-linkage filters
  const filteredResponse: IPageIShoppingMallSnapshot.ISummary =
    await api.functional.shoppingMall.admin.snapshots.history(adminConnection, {
      body: {
        sourceType,
        sourceOrderId: (sourceOrderId ?? undefined) as
          | (string & tags.Format<"uuid">)
          | undefined,
        sourceOrderItemId: (sourceOrderItemId ?? undefined) as
          | (string & tags.Format<"uuid">)
          | undefined,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSnapshot.IRequest,
    });
  typia.assert(filteredResponse);
  TestValidator.predicate(
    "filtered response must return at least one snapshot entry",
    () => filteredResponse.data.length > 0,
  );
  // 4) Validate cross-linkage correctness
  for (const item of filteredResponse.data) {
    TestValidator.equals("source_type matches", item.source_type, sourceType);
    TestValidator.equals(
      "source_order_id matches",
      item.source_order_id,
      sourceOrderId,
    );
    TestValidator.equals(
      "source_order_item_id matches",
      item.source_order_item_id,
      sourceOrderItemId,
    );
  }
  // 5) Validate no inlined payload/content fields
  const sample = filteredResponse.data[0];
  typia.assert(sample);
  TestValidator.predicate(
    "summary should not contain payload/content inline fields",
    () =>
      !("payload" in sample) &&
      !("content" in sample) &&
      !("body" in sample) &&
      !("data" in sample),
  );
}
