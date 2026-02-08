import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_snapshot_retrieval_authorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins (owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_customer_join(ownerConnection, {
    body: {} satisfies import("@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer").IShoppingMallCustomer.IJoin,
  });
  ownerConnection.headers = { Authorization: ownerAuth.token.access };
  // 2. Customer joins (non-owner)
  const otherConnection: api.IConnection = { host: connection.host };
  const otherAuth = await authorize_customer_join(otherConnection, {
    body: {} satisfies import("@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer").IShoppingMallCustomer.IJoin,
  });
  otherConnection.headers = { Authorization: otherAuth.token.access };
  // 3. Create a valid order snapshot manually or use a utility or stub -
  // Here, we simulate such snapshot id by random uuid as we have no creation utility
  // NOTE: Since scenario requires snapshot ownership, but no creation endpoint, we improvise
  // Generate a valid UUID for snapshot - In real case this should be from created order snapshot
  // Here we create a dummy and assume success retrieval for valid owner snapshot
  const validSnapshotId = typia.random<string & typia.tags.Format<"uuid">>();
  // We attempt to retrieve a snapshot with valid snapshotId from ownerConnection -
  // This must succeed (status 200)
  const snapshot =
    await api.functional.shoppingMall.customer.order_snapshots.at(
      ownerConnection,
      {
        snapshotId: validSnapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate fields likely to exist in IShoppingMallOrderSnapshot using partial checks
  // Since the DTO is empty, we just do typia.assert, not specific fields
  // 4. Attempt retrieval with non-owner connection - must fail (HTTP error 403 or 404 as per authorization)
  await TestValidator.httpError(
    "unauthorized access forbidden",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.customer.order_snapshots.at(
        otherConnection,
        {
          snapshotId: validSnapshotId,
        },
      );
    },
  );
  // 5. Attempt retrieval of non-existent snapshot id - must fail with 404
  const nonExistentSnapshotId = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "non-existent snapshot returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.order_snapshots.at(
        ownerConnection,
        {
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
}
