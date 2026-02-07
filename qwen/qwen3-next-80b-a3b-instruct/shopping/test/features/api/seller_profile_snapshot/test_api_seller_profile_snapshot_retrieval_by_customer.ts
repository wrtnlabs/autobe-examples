import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_seller_profile_snapshot_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 1: Customer joins the platform
  await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 2: Retrieve a seller profile snapshot ID from order history
  // Since we don't have direct access to order history endpoint,
  // we simulate snapshot creation by generating a valid snapshot
  // and assuming it was created during a past order
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Customer retrieves the seller profile snapshot
  const snapshot =
    await api.functional.shoppingMall.customer.seller_profile_snapshots.at(
      customerConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // Step 4: Validate snapshot structure
  // Note: IShoppingMallSellerProfileSnapshot is empty in DTO definition,
  // so we only verify it's a valid object and that the request succeeded
  // No additional validation possible as DTO has no properties
  TestValidator.predicate("snapshot exists", snapshot !== null);
}
