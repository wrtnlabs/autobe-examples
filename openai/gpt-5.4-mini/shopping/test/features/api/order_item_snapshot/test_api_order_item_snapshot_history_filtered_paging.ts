import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_item_snapshot_history_filtered_paging(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const now: Date = new Date();
  const request: IMallPlatformOrderItemSnapshot.IRequest = {
    page: 2,
    limit: 1,
    sort: "snapshotAt_desc",
    snapshotAtFrom: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
    snapshotAtTo: new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(),
    createdAtFrom: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
    createdAtTo: new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(),
  };
  const output: IPageIMallPlatformOrderItemSnapshot.ISummary =
    await api.functional.mallPlatform.administrator.orderItems.snapshots.index(
      administratorConnection,
      {
        orderItemId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "requested page is returned",
    output.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "requested limit is returned",
    output.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length respects limit",
    output.data.length <= request.limit!,
  );
  TestValidator.predicate(
    "snapshots are sorted newest-first by snapshotAt",
    output.data.every(
      (snapshot, index, array) =>
        index === 0 ||
        new Date(array[index - 1].snapshotAt).getTime() >=
          new Date(snapshot.snapshotAt).getTime(),
    ),
  );
  TestValidator.predicate(
    "snapshots satisfy the requested date window when present",
    output.data.every((snapshot) => {
      const snapshotAt = new Date(snapshot.snapshotAt).getTime();
      const createdAt = new Date(snapshot.createdAt).getTime();
      return (
        snapshotAt >= new Date(request.snapshotAtFrom!).getTime() &&
        snapshotAt <= new Date(request.snapshotAtTo!).getTime() &&
        createdAt >= new Date(request.createdAtFrom!).getTime() &&
        createdAt <= new Date(request.createdAtTo!).getTime()
      );
    }),
  );
}
