import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sale_snapshot_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempt to retrieve a sale snapshot without authentication
  // Generate a random UUID as snapshotId
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Try accessing the snapshot endpoint without authorizing (unauthenticated)
  await TestValidator.httpError(
    "unauthorized access to sale snapshot",
    401,
    async () => {
      // Directly call the sale_snapshots.at endpoint with base connection, no auth headers
      await api.functional.shoppingMall.customer.sale_snapshots.at(connection, {
        snapshotId,
      });
    },
  );
}
