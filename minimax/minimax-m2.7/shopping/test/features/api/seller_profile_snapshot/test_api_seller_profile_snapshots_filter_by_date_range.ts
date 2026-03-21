import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshots_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Update shop profile to create the first snapshot
  const firstProfile =
    await api.functional.ecommerceMall.seller.seller.profile.update(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(firstProfile);
  // Store timestamp of first update for filtering
  const firstUpdateTime = new Date();
  // 3. Wait briefly then update profile again to create second snapshot
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const secondProfile =
    await api.functional.ecommerceMall.seller.seller.profile.update(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(secondProfile);
  const secondUpdateTime = new Date();
  // 4. Get all snapshots to verify we have at least 2
  const allSnapshots =
    await api.functional.ecommerceMall.seller.seller_profile_snapshots.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate(
    "should have at least 2 snapshots",
    allSnapshots.data.length >= 2,
  );
  // 5. Filter with wide date range (includes both snapshots)
  const wideRangeSnapshots =
    await api.functional.ecommerceMall.seller.seller_profile_snapshots.index(
      sellerConnection,
      {
        body: {
          fromDate: new Date(firstUpdateTime.getTime() - 60000).toISOString(),
          toDate: new Date(secondUpdateTime.getTime() + 60000).toISOString(),
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(wideRangeSnapshots);
  TestValidator.predicate(
    "wide range should include both snapshots",
    wideRangeSnapshots.data.length >= 2,
  );
  // 6. Filter with narrow date range (includes only first snapshot)
  const narrowRangeSnapshots =
    await api.functional.ecommerceMall.seller.seller_profile_snapshots.index(
      sellerConnection,
      {
        body: {
          fromDate: new Date(firstUpdateTime.getTime() - 60000).toISOString(),
          toDate: new Date(firstUpdateTime.getTime() + 500).toISOString(),
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(narrowRangeSnapshots);
  TestValidator.predicate(
    "narrow range should include only first snapshot",
    narrowRangeSnapshots.data.length >= 1,
  );
  TestValidator.predicate(
    "narrow range should exclude second snapshot",
    narrowRangeSnapshots.data.length < 2,
  );
  // 7. Filter with date range before first snapshot (should be empty or have initial state)
  const beforeSnapshots =
    await api.functional.ecommerceMall.seller.seller_profile_snapshots.index(
      sellerConnection,
      {
        body: {
          fromDate: new Date(
            firstUpdateTime.getTime() - 86400000,
          ).toISOString(),
          toDate: new Date(firstUpdateTime.getTime() - 1000).toISOString(),
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(beforeSnapshots);
  // 8. Verify response schema - pagination metadata
  TestValidator.equals(
    "pagination current is valid",
    narrowRangeSnapshots.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination limit is valid",
    narrowRangeSnapshots.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "pagination records matches data length",
    narrowRangeSnapshots.pagination.records,
    narrowRangeSnapshots.data.length,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    narrowRangeSnapshots.pagination.pages,
    Math.ceil(
      narrowRangeSnapshots.pagination.records /
        narrowRangeSnapshots.pagination.limit,
    ),
  );
  // 9. Verify response schema - snapshot structure
  for (const snapshot of wideRangeSnapshots.data) {
    TestValidator.equals(
      "snapshot has valid uuid id",
      /^[0-9a-f-]{36}$/i.test(snapshot.id),
      true,
    );
    TestValidator.predicate(
      "snapshot has shop_name",
      typeof snapshot.shop_name === "string",
    );
    TestValidator.predicate(
      "snapshot has valid created_at",
      typeof snapshot.created_at === "string",
    );
    typia.assert(snapshot);
  }
}
