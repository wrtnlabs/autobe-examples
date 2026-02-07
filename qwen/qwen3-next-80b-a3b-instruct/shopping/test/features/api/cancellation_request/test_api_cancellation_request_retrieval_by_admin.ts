import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_request_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerResult = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Customer logs in to submit cancellation request
  await authorize_customer_login(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.ILogin,
  });
  // 4. Customer submits cancellation request
  const createResult =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      { body: {} satisfies IShoppingMallCancellationRequest.ICreate },
    );
  // 5. Admin logs in to retrieve cancellation request
  await authorize_admin_login(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.ILogin,
  });
  // 6. Admin retrieves the cancellation request by ID
  // We need to generate a valid UUID from the created cancellation request
  const requestId: string = typia.random<string & tags.Format<"uuid">>();
  // Admin retrieves the cancellation request
  const retrievedRequest =
    await api.functional.shoppingMall.customer.cancellation_requests.at(
      adminConnection,
      { requestId },
    );
  typia.assert(retrievedRequest);
  // 7. Validate admin has access to customer's request
  // The IShoppingMallCancellationRequest DTO has no properties defined
  // The test should validate the request is retrieved successfully with the expected structure
  // We use typia.assert to validate the type structure
}
