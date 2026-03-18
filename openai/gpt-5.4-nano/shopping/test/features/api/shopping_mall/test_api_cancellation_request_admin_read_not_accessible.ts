import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_request_admin_read_not_accessible(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authorization (use utility via authorize_admin_join)
  const adminConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: credentials });
  // 2) Pick a UUID that should not exist
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3) Call read endpoint and expect failure (404/403 etc.)
  await TestValidator.error(
    "admin read cancellation request not accessible should fail",
    async () => {
      await api.functional.shoppingMall.admin.admin.cancellation_requests.at(
        adminConnection,
        {
          cancellationRequestId,
        },
      );
    },
  );
  // 4) No side effects is hard to observe with provided API/DTO surface.
}
