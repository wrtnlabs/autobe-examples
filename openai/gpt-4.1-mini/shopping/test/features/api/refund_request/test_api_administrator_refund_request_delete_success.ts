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

/**
 * Test deletion of a refund request by an authorized administrator.
 *
 * Since the scenario does not provide API to create or fetch refund requests, this test:
 * 1. Admin joins and authenticates.
 * 2. Attempts to delete a random refundRequestId expecting 404 error.
 *
 * This ensures authorization enforcement and proper error responses.
 */
export async function test_api_administrator_refund_request_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "longenoughpassword",
    },
  });
  // adminConnection.headers already updated by authorize utility
  // 2. Attempt to delete a refund request that does not exist
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent refund request should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.refund_requests.erase(
        adminConnection,
        {
          refundRequestId,
        },
      );
    },
  );
}
