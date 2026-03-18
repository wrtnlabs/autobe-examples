import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_requests_admin_list_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2) List cancellation requests using a non-existent order item id filter
  const nonexistentOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    page: 1,
    limit: 10,
    includeDeleted: false,
    shoppingMallOrderItemId: nonexistentOrderItemId,
  } satisfies IShoppingMallCancellationRequest.IRequest;
  const result =
    await api.functional.shoppingMall.admin.admin.cancellation_requests.index(
      adminConnection,
      {
        body,
      },
    );
  typia.assert(result);
  // 3) Validate empty result
  TestValidator.equals(
    "cancellation requests data should be empty",
    result.data,
    [],
  );
  TestValidator.equals(
    "cancellation requests pagination.records should be 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "cancellation requests pagination.pages should be 0",
    result.pagination.pages,
    0,
  );
}
