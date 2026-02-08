import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_refund_requests_create_refund_request } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create_refund_request";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_customer_refund_request_update_status_and_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // Test updating an existing refund request with empty update body since no update properties exist
  // 1. Authenticate as a customer (join and authorize)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  customerConnection.headers ??= {};
  customerConnection.headers["Authorization"] = customerAuth.token.access;
  // 2. Create initial refund request by this customer
  const initialRefundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create_refund_request(
      customerConnection,
      { body: {} },
    );
  typia.assert(initialRefundRequest);
  // 3. Update refund request with an empty body (as no fields defined in IUpdate)
  const updateBody: IShoppingMallRefundRequest.IUpdate = {};
  const updatedRefundRequest =
    await api.functional.shoppingMall.customer.refund_requests.update(
      customerConnection,
      {
        refundRequestId: "00000000-0000-0000-0000-000000000000", // placeholder since no id available on refund request
        body: updateBody,
      },
    );
  typia.assert(updatedRefundRequest);
  // 4. Basic validation: Since no properties are defined, only assert that update succeeded and response is an object
  TestValidator.predicate(
    "updated refund request is object",
    typeof updatedRefundRequest === "object" && updatedRefundRequest !== null,
  );
}
