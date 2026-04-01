import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
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

export async function test_api_order_item_snapshot_history_listing(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorization = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorization);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 100,
    sort: "-snapshotAt",
  } satisfies IMallPlatformOrderItemSnapshot.IRequest;
  const response =
    await api.functional.mallPlatform.administrator.order_items.snapshots.index(
      adminConnection,
      {
        orderItemId,
        body: request,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "pagination records are non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  for (const item of response.data) {
    typia.assert(item);
  }
  if (response.data.length >= 2) {
    const sorted = [...response.data].sort((a, b) => {
      const snapshotDelta = b.snapshotAt.localeCompare(a.snapshotAt);
      if (snapshotDelta !== 0) return snapshotDelta;
      return b.createdAt.localeCompare(a.createdAt);
    });
    TestValidator.equals(
      "snapshots are sorted newest first",
      response.data,
      sorted,
    );
  }
  const filterCandidate = response.data.find(
    (item) => item.orderItemStatus.length > 0 || item.snapshotReason.length > 0,
  );
  if (filterCandidate !== undefined) {
    const filtered =
      await api.functional.mallPlatform.administrator.order_items.snapshots.index(
        adminConnection,
        {
          orderItemId,
          body: {
            orderItemStatus: filterCandidate.orderItemStatus,
            page: 1,
            limit: 100,
            sort: "-snapshotAt",
          } satisfies IMallPlatformOrderItemSnapshot.IRequest,
        },
      );
    typia.assert(filtered);
    TestValidator.predicate(
      "filtered results stay within the same order item snapshot history",
      filtered.data.every(
        (item) => item.orderItemStatus === filterCandidate.orderItemStatus,
      ),
    );
    TestValidator.predicate(
      "filtered result count does not exceed unfiltered result count",
      filtered.data.length <= response.data.length,
    );
  }
}
