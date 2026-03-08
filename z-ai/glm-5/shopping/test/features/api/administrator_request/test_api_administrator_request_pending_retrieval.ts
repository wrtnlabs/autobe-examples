import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorSession";
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
import { generate_random_shopping_mall_customer_requests_create } from "../../../generate/generate_random_shopping_mall_customer_requests_create";
import { prepare_random_shopping_mall_administrator_session } from "../../../prepare/prepare_random_shopping_mall_administrator_session";

/**
 * Test super administrator retrieving a pending administrator request for review.
 *
 * Test Flow:
 * 1. Create a customer account via POST /shoppingMall/auth/customer/join
 * 2. Customer submits an administrator request via POST /shoppingMall/customer/requests with a meaningful reason
 * 3. Create an administrator account via POST /shoppingMall/auth/administrator/join
 * 4. Administrator retrieves the pending request by requestId via GET /shoppingMall/administrator/requests/{requestId}
 *
 * Validation Points:
 * - Response returns complete request details
 * - Request ID matches the retrieved request
 * - All required fields are present in the response
 */
export async function test_api_administrator_request_pending_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Customer submits administrator request with meaningful reason
  const reason = RandomGenerator.paragraph({ sentences: 5 });
  const request = await generate_random_shopping_mall_customer_requests_create(
    customerConnection,
    { body: { reason } },
  );
  typia.assert(request);
  // 3. Create administrator account to retrieve the request
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 4. Administrator retrieves the pending request by requestId
  const retrievedRequest =
    await api.functional.shoppingMall.administrator.requests.at(
      adminConnection,
      { requestId: request.id },
    );
  typia.assert(retrievedRequest);
  // 5. Validate request ID matches
  TestValidator.equals("request ID matches", retrievedRequest.id, request.id);
}
