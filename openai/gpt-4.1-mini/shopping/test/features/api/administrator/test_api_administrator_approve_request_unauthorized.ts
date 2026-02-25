import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request } from "../../../generate/generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_approve_request_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate (unauthorized for administrator endpoint)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(customerAuthorized);
  // Update headers after authorization
  customerConnection.headers = {
    Authorization: customerAuthorized.token.access,
  };
  // 2. Create an administrator request as authenticated customer (to have a valid request ID)
  const administratorRequest =
    await generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request(
      customerConnection,
      {
        body: {
          actor_type: "customer",
          reason: "Testing unauthorized approve",
        },
      },
    );
  typia.assert(administratorRequest);
  // 3. Attempt to approve administrator request using customer connection (unauthorized)
  await TestValidator.error(
    "non-administrator cannot approve administrator request",
    async () => {
      await api.functional.shoppingMall.administrator.requests.approve.approveAdministratorRequest(
        customerConnection,
        { requestId: administratorRequest.id },
      );
    },
  );
}
