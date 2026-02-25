import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refund_request_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join to get authorized session
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(authorized);
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Generate a random UUID that does not exist as refundRequestId
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to DELETE the refund request with non-existent refundRequestId
  await TestValidator.httpError(
    "refund request erase with non-existent ID returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.refund_requests.erase(
        customerConnection,
        {
          refundRequestId,
        },
      );
    },
  );
}
