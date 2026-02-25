import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refund_request_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and obtains authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
    },
  });
  typia.assert(administrator);
  // 2. Attempts to delete refund request with non-existent UUID
  const nonExistentRefundRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Verifies system responds with HTTP 404 Not Found error
  await TestValidator.httpError(
    "refund request deletion not found",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.refund_requests.erase(
        adminConnection,
        { refundRequestId: nonExistentRefundRequestId },
      );
    },
  );
}
