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

export async function test_api_admin_snapshot_history_pagination_metadata_consistency(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin join
  const adminConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: credentials });
  const historyBase = async (
    body: IShoppingMallSnapshot.IRequest,
  ): Promise<IPageIShoppingMallSnapshot.ISummary> => {
    const output = await api.functional.shoppingMall.admin.snapshots.history(
      adminConnection,
      {
        body,
      },
    );
    typia.assert(output);
    return output;
  };
  // Scenario 1
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  // Deterministic sort: prefer explicit field if supported, otherwise omit.
  // Since IRequest.sort is opaque string, we can still supply a deterministic value.
  const sort = "created_at_desc";
  const result1 = await historyBase({
    page,
    limit,
    sort,
  });
  TestValidator.equals("pagination.current", result1.pagination.current, page);
  TestValidator.equals("pagination.limit", result1.pagination.limit, limit);
  TestValidator.predicate(
    "pagination.records >= data.length",
    result1.pagination.records >= result1.data.length,
  );
  const expectedPages = Math.ceil(
    result1.pagination.records /
      (result1.pagination.limit === 0 ? 1 : result1.pagination.limit),
  );
  TestValidator.equals(
    "pagination.pages matches ceil(records/limit)",
    result1.pagination.pages,
    expectedPages,
  );
  TestValidator.predicate("data length <= limit", result1.data.length <= limit);
  // Scenario 2
  const result2 = await historyBase({
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>),
  });
  typia.assert(result2);
  TestValidator.predicate("created_at sorted descending", () =>
    result2.data.every(
      (item, index) =>
        index === 0 ||
        new Date(result2.data[index - 1].created_at).getTime() >=
          new Date(item.created_at).getTime(),
    ),
  );
  // Scenario 3: empty results with well-formed UUID filters.
  const observed = result1.data[0];
  // If history1 returned empty data, fall back to result2 data.
  const observedAny = observed ?? result2.data[0];
  if (observedAny !== undefined) {
    // Choose a linkage filter that exists on observed snapshot.
    // We'll pick source_order_id if available; then set source_order_item_id to a random UUID unlikely to exist.
    const baseSourceType = observedAny.source_type;
    const baseSourceEntityId = observedAny.source_entity_id;
    const randomNonMatchingOrderItemId = typia.random<
      string & tags.Format<"uuid">
    >();
    const filterBody: IShoppingMallSnapshot.IRequest = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 5 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      sourceType: baseSourceType,
      sourceEntityId: baseSourceEntityId,
      sourceOrderId: (observedAny.source_order_id ?? undefined) as
        | (string & tags.Format<"uuid">)
        | undefined,
      sourceOrderItemId: randomNonMatchingOrderItemId,
    };
    const result3 = await historyBase(filterBody);
    typia.assert(result3);
    TestValidator.equals("data empty", result3.data.length, 0);
    TestValidator.equals("pagination.records=0", result3.pagination.records, 0);
  }
}
