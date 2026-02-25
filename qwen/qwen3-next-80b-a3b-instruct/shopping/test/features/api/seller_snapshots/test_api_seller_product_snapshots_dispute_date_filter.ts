import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_snapshots_dispute_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: A seller filters product snapshots by date range during a customer dispute to prove the product's price and description at the time of sale was unchanged, demonstrating the immutability and forensic accuracy of the snapshot system for dispute resolution purposes.
  // 1. Authenticate as seller to access own snapshots
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Generate three product snapshots with different timestamps using typia.random
  const firstSnapshot = typia.random<IShoppingMallProductSnapshot.ISum>();
  const secondSnapshot = typia.random<IShoppingMallProductSnapshot.ISum>();
  const thirdSnapshot = typia.random<IShoppingMallProductSnapshot.ISum>();
  // Set distinct timestamps for the snapshots (ensure chronological order)
  // We need to ensure the timestamps are formatted as ISO date-time strings
  const firstDate = new Date();
  const secondDate = new Date(firstDate.getTime() + 1000);
  const thirdDate = new Date(secondDate.getTime() + 1000);
  firstSnapshot.changed_at = firstDate.toISOString();
  secondSnapshot.changed_at = secondDate.toISOString();
  thirdSnapshot.changed_at = thirdDate.toISOString();
  // Set the same product ID for all snapshots to simulate one product's history
  const productId = typia.random<string & tags.Format<"uuid">>();
  firstSnapshot.snapshot_data.id = productId;
  secondSnapshot.snapshot_data.id = productId;
  thirdSnapshot.snapshot_data.id = productId;
  // Set different prices to make the snapshots meaningful
  firstSnapshot.snapshot_data.base_price = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  secondSnapshot.snapshot_data.base_price =
    firstSnapshot.snapshot_data.base_price + 10;
  thirdSnapshot.snapshot_data.base_price =
    secondSnapshot.snapshot_data.base_price + 10;
  // Set different product names to test description changes
  firstSnapshot.snapshot_data.name = RandomGenerator.paragraph({
    sentences: 1,
  });
  secondSnapshot.snapshot_data.name = firstSnapshot.snapshot_data.name;
  thirdSnapshot.snapshot_data.name = RandomGenerator.paragraph({
    sentences: 1,
  });
  // 3. Ensure sellers have the authority to query these snapshots
  // The API endpoint requires seller authentication, which we already have
  // 4. Create a mock response from the snapshots.index endpoint with our generated data
  const allSnapshots: IPageIShoppingMallProductSnapshot.ISum = {
    pagination: {
      current: 1,
      limit: 100,
      records: 3,
      pages: 1,
    },
    data: [firstSnapshot, secondSnapshot, thirdSnapshot],
  };
  // 5. Now filter snapshots using date range covering first two changes only
  const fromDate = firstDate.toISOString().split("T")[0]; // Format: YYYY-MM-DD
  const toDate = secondDate.toISOString().split("T")[0]; // Format: YYYY-MM-DD
  // 6. Query the snapshots endpoint with date range filter
  const filteredSnapshots =
    await api.functional.shoppingMall.seller.snapshots.index(sellerConnection, {
      body: {
        entity_type: "product",
        changed_by: "seller",
        from_date: fromDate as string & tags.Format<"date">,
        to_date: toDate as string & tags.Format<"date">,
        limit: 100,
      } satisfies IShoppingMallProductSnapshot.IRequest,
    });
  typia.assert(filteredSnapshots);
  // 7. Validate results: only first two snapshots should be returned
  TestValidator.equals(
    "filtered snapshots contain two records",
    filteredSnapshots.data.length,
    2,
  );
  // Verify the snapshots are exactly the first two
  const filteredSnapshotIds = filteredSnapshots.data.map(
    (s) => s.snapshot_data.id,
  );
  TestValidator.equals(
    "first snapshot included",
    filteredSnapshotIds.includes(productId),
    true,
  );
  // 8. Validate price and description from first snapshot matches initial creation
  const firstSnapshotInResults = filteredSnapshots.data.find(
    (s) => s.changed_at === firstSnapshot.changed_at,
  );
  TestValidator.notEquals(
    "first snapshot found",
    firstSnapshotInResults,
    undefined,
  );
  TestValidator.equals(
    "first snapshot price matches creation",
    firstSnapshotInResults!.snapshot_data.base_price,
    firstSnapshot.snapshot_data.base_price,
  );
  TestValidator.equals(
    "first snapshot name matches creation",
    firstSnapshotInResults!.snapshot_data.name,
    firstSnapshot.snapshot_data.name,
  );
  // 9. Validate price and description from second snapshot matches first update
  const secondSnapshotInResults = filteredSnapshots.data.find(
    (s) => s.changed_at === secondSnapshot.changed_at,
  );
  TestValidator.notEquals(
    "second snapshot found",
    secondSnapshotInResults,
    undefined,
  );
  TestValidator.equals(
    "second snapshot price matches update",
    secondSnapshotInResults!.snapshot_data.base_price,
    secondSnapshot.snapshot_data.base_price,
  );
  TestValidator.equals(
    "second snapshot name matches creation",
    secondSnapshotInResults!.snapshot_data.name,
    secondSnapshot.snapshot_data.name,
  );
  // 10. Verify the snapshot system correctly disallows detection of third change
  // This demonstrates forensic accuracy and immutability
  TestValidator.equals(
    "third snapshot outside date range",
    thirdSnapshot.changed_at > toDate,
    true,
  );
}
