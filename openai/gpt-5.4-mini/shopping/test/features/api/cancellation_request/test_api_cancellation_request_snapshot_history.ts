import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_cancellation_request_snapshot_history(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformCancellationRequestSnapshot.IRequest;
  const response =
    await api.functional.mallPlatform.seller.orderItems.cancellationRequests.snapshots.index(
      sellerConnection,
      {
        orderItemId,
        cancellationRequestId,
        body: request,
      },
    );
  typia.assert(response);
  TestValidator.equals("snapshot page current", response.pagination.current, 1);
  TestValidator.equals("snapshot page limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "snapshot records within page limit",
    response.data.length <= response.pagination.limit,
  );
  for (let i = 1; i < response.data.length; i++) {
    TestValidator.predicate(
      "snapshots sorted newest-first by changedAt",
      response.data[i - 1].changedAt >= response.data[i].changedAt,
    );
  }
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    TestValidator.predicate("snapshot id preserved", snapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot status preserved",
      snapshot.snapshotStatus.length > 0,
    );
    TestValidator.predicate(
      "snapshot timestamps preserved",
      snapshot.changedAt.length > 0 &&
        snapshot.createdAt.length > 0 &&
        snapshot.updatedAt.length > 0,
    );
  }
}
