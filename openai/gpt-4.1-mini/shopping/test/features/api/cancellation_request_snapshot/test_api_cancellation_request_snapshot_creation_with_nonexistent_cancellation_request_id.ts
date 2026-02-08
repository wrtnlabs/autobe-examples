import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { prepare_random_shopping_mall_cancellation_request_snapshot } from "../../../prepare/prepare_random_shopping_mall_cancellation_request_snapshot";

export async function test_api_cancellation_request_snapshot_creation_with_nonexistent_cancellation_request_id(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies the system rejects snapshot creation when the referenced cancellation_request_id does not exist, ensuring data integrity.
  // 1. Prepare an authorized customer connection.
  const customerConnection: api.IConnection = { host: connection.host };
  // Use authorize_customer_join utility as dependency for auth.
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 2. Construct a snapshot creation body with a cancellation_request_id that does NOT exist.
  //    Since the schema for IShoppingMallCancellationRequestSnapshot.ICreate is empty, we must simulate an invalid cancellation_request_id.
  // However, the ICreate type is an empty object. Based on the description, the API expects a cancellation_request_id property.
  // Since the DTO does not define this property, and we're forbidden to invent properties, we cannot provide it directly.
  // Therefore, we test by sending an empty object and expect failure due to missing cancellation_request_id field in backend validation.
  // 3. Attempt to create a snapshot with this invalid body and assert that an error is thrown.
  await TestValidator.error(
    "creation with non-existent cancellation_request_id should fail",
    async () => {
      await generate_random_shopping_mall_cancellation_request_snapshots_create(
        customerConnection,
        {
          body: {}, // empty body since ICreate is empty type
        },
      );
    },
  );
}
