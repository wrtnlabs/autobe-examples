import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
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

export async function test_api_cancellation_request_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate a random cancellation request ID
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve snapshots for the cancellation request
  const output =
    await api.functional.shoppingMall.customer.cancellations.snapshots.search(
      customerConnection,
      { cancellationRequestId },
    );
  // 4. Validate the response structure using typia.assert (complete validation)
  typia.assert(output);
  // 5. Validate pagination structure
  TestValidator.equals(
    "Total records should be >= 0",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "Current page should be 1",
    output.pagination.current,
    1,
  );
  TestValidator.predicate(
    "Limit should be positive",
    () => output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "Pages should be >= 0",
    () => output.pagination.pages >= 0,
  );
  // 6. Validate that when no snapshots exist, data is empty array
  TestValidator.equals(
    "Data array should be present and empty if no snapshots",
    output.data.length,
    0,
  );
}
