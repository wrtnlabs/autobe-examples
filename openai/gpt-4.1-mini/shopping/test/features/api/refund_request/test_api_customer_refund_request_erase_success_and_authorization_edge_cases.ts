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

export async function test_api_customer_refund_request_erase_success_and_authorization_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful refund request deletion by the customer who created it.
  {
    const customerConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_customer_join(customerConnection, {
      body: {},
    });
    customerConnection.headers = { Authorization: authorized.token.access };
    const refundRequest =
      await generate_random_shopping_mall_customer_refund_requests_create_refund_request(
        customerConnection,
        { body: {} },
      );
    typia.assert(refundRequest);
    await api.functional.shoppingMall.customer.refund_requests.erase(
      customerConnection,
      {
        refundRequestId: (refundRequest as IEntity).id,
      },
    );
  }
  // Scenario 2: Attempt to delete a non-existent refund request.
  {
    const customerConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_customer_join(customerConnection, {
      body: {},
    });
    customerConnection.headers = { Authorization: authorized.token.access };
    const fakeRefundRequestId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "delete non-existent refund request",
      404,
      async () =>
        await api.functional.shoppingMall.customer.refund_requests.erase(
          customerConnection,
          {
            refundRequestId: fakeRefundRequestId,
          },
        ),
    );
  }
  // Scenario 3: Attempt to delete a refund request belonging to another customer.
  {
    // Customer A
    const customerAConnection: api.IConnection = { host: connection.host };
    const authorizedA = await authorize_customer_join(customerAConnection, {
      body: {},
    });
    customerAConnection.headers = { Authorization: authorizedA.token.access };
    const refundRequestA =
      await generate_random_shopping_mall_customer_refund_requests_create_refund_request(
        customerAConnection,
        { body: {} },
      );
    typia.assert(refundRequestA);
    // Customer B
    const customerBConnection: api.IConnection = { host: connection.host };
    const authorizedB = await authorize_customer_join(customerBConnection, {
      body: {},
    });
    customerBConnection.headers = { Authorization: authorizedB.token.access };
    // Customer B tries to delete Customer A's refund request
    await TestValidator.httpError(
      "unauthorized refund request deletion",
      403,
      async () =>
        await api.functional.shoppingMall.customer.refund_requests.erase(
          customerBConnection,
          {
            refundRequestId: (refundRequestA as IEntity).id,
          },
        ),
    );
    // Customer A deletes refund request successfully to confirm it still exists
    await api.functional.shoppingMall.customer.refund_requests.erase(
      customerAConnection,
      {
        refundRequestId: (refundRequestA as IEntity).id,
      },
    );
  }
}
