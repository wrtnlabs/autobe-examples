import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShopProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller account creation and login
  // Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAccount = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: "https://example.com/seller-join",
      referrer: "https://example.com/",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAccount);
  // 2. Retrieve shop profile snapshots for the seller
  // The snapshot index endpoint returns all snapshots for the authenticated seller
  // Snapshots are created whenever shop profile is edited
  const snapshotsConnection: api.IConnection = { host: connection.host };
  snapshotsConnection.headers = {
    ...snapshotsConnection.headers,
    Authorization: sellerAccount.token.access,
  };
  // 3. Fetch snapshots with pagination
  const snapshotResponse =
    await api.functional.ecommerceMall.seller.shop_profile_snapshots.index(
      snapshotsConnection,
      {
        body: {
          limit: 20, // Get up to 20 snapshots per page
        } satisfies IEcommerceMallShopProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 4. Validate response structure
  typia.assert(snapshotResponse);
  typia.assert(snapshotResponse.pagination);
  typia.assert(snapshotResponse.data);
  // 5. Validate pagination metadata exists and has correct types
  TestValidator.predicate(
    "pagination current should be non-negative integer",
    snapshotResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative integer",
    snapshotResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative integer",
    snapshotResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative integer",
    snapshotResponse.pagination.pages >= 0,
  );
  // 6. Validate each snapshot in the response has correct structure
  for (let i = 0; i < snapshotResponse.data.length; i++) {
    const snapshot = snapshotResponse.data[i];
    typia.assert(snapshot);
    // Validate all required fields exist
    TestValidator.predicate(
      `snapshot ${i + 1} id should exist and be valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    TestValidator.predicate(
      `snapshot ${i + 1} ecommerce_mall_shop_profile_id should exist and be valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.ecommerce_mall_shop_profile_id,
      ),
    );
    TestValidator.predicate(
      `snapshot ${i + 1} created_at should be valid ISO 8601 datetime`,
      !isNaN(Date.parse(snapshot.created_at)),
    );
    TestValidator.predicate(
      `snapshot ${i + 1} shop_name should be non-empty string`,
      typeof snapshot.shop_name === "string" && snapshot.shop_name.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${i + 1} shop_description should be null or string`,
      snapshot.shop_description === null ||
        typeof snapshot.shop_description === "string",
    );
    TestValidator.predicate(
      `snapshot ${i + 1} logo_url should be null or string`,
      snapshot.logo_url === null || typeof snapshot.logo_url === "string",
    );
  }
  // 7. Validate temporal ordering - snapshots should be sorted by created_at descending
  if (snapshotResponse.data.length >= 2) {
    for (let i = 0; i < snapshotResponse.data.length - 1; i++) {
      const currentSnapshot = snapshotResponse.data[i];
      const nextSnapshot = snapshotResponse.data[i + 1];
      TestValidator.predicate(
        `snapshots ${i + 1} and ${i + 2} should be in descending order by created_at`,
        new Date(currentSnapshot.created_at).getTime() >=
          new Date(nextSnapshot.created_at).getTime(),
      );
    }
  }
  // 8. Validate snapshot immutability - all snapshots should have unique IDs
  const snapshotIds = snapshotResponse.data.map((s) => s.id);
  const uniqueSnapshotIds = new Set(snapshotIds);
  TestValidator.equals(
    "all snapshot IDs should be unique",
    uniqueSnapshotIds.size,
    snapshotIds.length,
  );
  // 9. Validate pagination consistency
  TestValidator.equals(
    "pagination records should match data length if within limit",
    snapshotResponse.data.length,
    snapshotResponse.pagination.records,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1 when records exist",
    snapshotResponse.pagination.records > 0
      ? snapshotResponse.pagination.pages >= 1
      : snapshotResponse.pagination.pages === 0,
  );
}