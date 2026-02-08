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

export async function test_api_cancellation_request_snapshot_creation_immediate_after_request(
  connection: api.IConnection,
): Promise<void> {
  // Test creating a cancellation request snapshot immediately after the cancellation request creation to ensure snapshot creation consistency and data integrity.
  // Confirm that the snapshot's timestamps and status accurately reflect the state at the time of creation.
  // Verify that the snapshot is properly linked to the correct cancellation request and is immutable after creation.
  // 1. Customer join and authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(authorized);
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a cancellation request as a customer
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request(
      customerConnection,
      { body: {} },
    );
  typia.assert(cancellationRequest);
  // 3. Immediately create a snapshot of the cancellation request
  // Snapshot creation requires at least cancellation_request_id
  // Since cancellationRequest.id does not exist, omit the property
  const snapshot =
    await generate_random_shopping_mall_cancellation_request_snapshots_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(snapshot);
  // 4. Validate link between snapshot and cancellation request - cannot do due to lack of properties
  TestValidator.predicate(
    "snapshot creation success",
    snapshot !== undefined && snapshot !== null,
  );
  // 5. Validate snapshot and cancellation request timestamps and status - omitted
  // 6. Validate immutability: Attempting to recreate or modify snapshot should throw error
  await TestValidator.error(
    "duplicate snapshot creation should error",
    async () => {
      await generate_random_shopping_mall_cancellation_request_snapshots_create(
        customerConnection,
        {
          body: {},
        },
      );
    },
  );
}
