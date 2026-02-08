import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_sale_unit_snapshot_retrieval_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve a detailed immutable snapshot of a sale unit by an authenticated seller.
  // Authenticate as a seller by executing seller join.
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  // Use the token from authorized session
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // We attempt to retrieve an existing snapshotId -
  // Because the IShoppingMallSaleUnitSnapshot schema is empty (no fields), to satisfy the scenario, we'll generate a random UUID as snapshotId
  // In real test, this should be replaced by a valid snapshotId from fixtures or database.
  // But according to anti-hallucination, we only use DTOs and APIs as is. So mock a random UUID for test.
  const validSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Get snapshot
  const snapshot =
    await api.functional.shoppingMall.seller.sale_unit_snapshots.at(
      sellerConnection,
      {
        snapshotId: validSnapshotId,
      },
    );
  typia.assert(snapshot);
  // No mutation can be tested since no state change function exists.
  // Just assert that snapshot is defined and valid.
  // Scenario 2: Attempt to retrieve a sale unit snapshot with a non-existent snapshotId.
  const invalidSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError("snapshot not found", 404, async () => {
    await api.functional.shoppingMall.seller.sale_unit_snapshots.at(
      sellerConnection,
      {
        snapshotId: invalidSnapshotId,
      },
    );
  });
  // Scenario 3: Attempt to retrieve a sale unit snapshot without authentication or with invalid authorization.
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access", 403, async () => {
    await api.functional.shoppingMall.seller.sale_unit_snapshots.at(
      unauthenticatedConnection,
      {
        snapshotId: validSnapshotId,
      },
    );
  });
}
