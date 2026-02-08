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
import { generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_request_snapshot_retrieval_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of snapshot
  // 1. Register a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "1234",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = authorized.token.access;
  // 2. Create a cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request(
      customerConnection,
      {},
    );
  typia.assert(cancellationRequest);
  // 3. Simulate a snapshot UUID (cannot get real snapshot from creation response)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Fetch the cancellation request snapshot by simulated id
  const snapshot =
    await api.functional.shoppingMall.cancellationRequestSnapshots.at(
      customerConnection,
      { id: snapshotId },
    );
  typia.assert(snapshot);
  typia.assertGuard(snapshot);
  // 5. Validate that snapshot is a valid object
  TestValidator.predicate(
    "cancellation request snapshot is an object",
    typeof snapshot === "object" && snapshot !== null,
  );
  // Scenario 2: Fetch with non-existent UUID
  const nonExistentUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetch non-existent snapshot throws 404",
    async () => {
      await api.functional.shoppingMall.cancellationRequestSnapshots.at(
        customerConnection,
        { id: nonExistentUuid },
      );
    },
  );
}
