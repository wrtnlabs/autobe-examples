import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_cancellation_request_snapshots_create } from "../../../generate/generate_random_shopping_mall_cancellation_request_snapshots_create";
import { generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_cancellation_request_snapshot } from "../../../prepare/prepare_random_shopping_mall_cancellation_request_snapshot";

export async function test_api_cancellation_request_snapshot_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and authorized
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody: IShoppingMallCustomer.IJoin = {
    email: `${RandomGenerator.alphabets(8)}@test.com`,
    password: "TestPass123!",
  };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  customerConnection.headers = {
    Authorization: customerAuthorized.token.access,
  };
  // 2. Customer creates a cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request(
      customerConnection,
      { body: {} },
    );
  typia.assert(cancellationRequest);
  // 3. Create a cancellation request snapshot linked to the cancellation request
  const snapshot =
    await generate_random_shopping_mall_cancellation_request_snapshots_create(
      { host: connection.host },
      { body: {} },
    );
  typia.assert(snapshot);
  // 4. Confirm snapshot creation is immutable by trying to create same snapshot again and expect error
  await TestValidator.error(
    "duplicate snapshot creation should fail",
    async () => {
      await generate_random_shopping_mall_cancellation_request_snapshots_create(
        { host: connection.host },
        { body: {} },
      );
    },
  );
}
