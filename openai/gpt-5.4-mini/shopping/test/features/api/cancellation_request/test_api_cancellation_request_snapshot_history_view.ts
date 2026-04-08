import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cancellation_request_snapshot_history_view(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const first: IPageIMallPlatformCancellationRequestSnapshot.ISummary =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.snapshots.getByOrderitemidAndCancellationrequestid(
      adminConnection,
      {
        orderItemId,
        cancellationRequestId,
      },
    );
  typia.assert(first);
  const second: IPageIMallPlatformCancellationRequestSnapshot.ISummary =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.snapshots.getByOrderitemidAndCancellationrequestid(
      adminConnection,
      {
        orderItemId,
        cancellationRequestId,
      },
    );
  typia.assert(second);
  TestValidator.equals("snapshot page is stable", second, first);
  TestValidator.predicate(
    "pagination metadata is non-negative",
    first.pagination.current >= 0 &&
      first.pagination.limit >= 0 &&
      first.pagination.records >= 0 &&
      first.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot list is an array",
    Array.isArray(first.data),
  );
}
