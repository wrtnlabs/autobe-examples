import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sales_review_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempt to delete a non-existent review or one not linked to the specified saleId.
  // Verify operation returns 404 Not Found error.
  // 1. Create a new customer and get authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(connection, {});
  // Set auth token in headers
  customerConnection.headers = { Authorization: customer.token.access };
  // 2. Generate random UUIDs for saleId and reviewId which do not exist
  const saleId = typia.random<string & tags.Format<"uuid">>();
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete with these IDs - expect HTTP 404 error
  await TestValidator.httpError(
    "delete non-existent review returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sales.reviews.erase(
        customerConnection,
        { saleId, reviewId },
      );
    },
  );
}
