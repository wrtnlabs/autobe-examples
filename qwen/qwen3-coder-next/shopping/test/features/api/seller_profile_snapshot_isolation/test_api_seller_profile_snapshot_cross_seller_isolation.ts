import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShopProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_cross_seller_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two sellers: seller A (test actor) and seller B (target)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await api.functional.ecommerceMall.auth.seller.join(
    sellerAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        shop_name: `Shop A ${RandomGenerator.name()}`,
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerA);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await api.functional.ecommerceMall.auth.seller.join(
    sellerBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        shop_name: `Shop B ${RandomGenerator.name()}`,
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerB);
  // 2. Scenario 1: Same-seller ID attempt - seller A queries with their own ID
  const sameSellerResult =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerAConnection,
      {
        body: {
          page: 1,
          limit: 100,
          seller_id: sellerA.id,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(sameSellerResult);
  // Should return seller A's own snapshots (possibly empty if none exist yet)
  // 3. Scenario 2: Different seller ID attempt - seller A queries with seller B's ID
  const differentSellerResult =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerAConnection,
      {
        body: {
          page: 1,
          limit: 100,
          seller_id: sellerB.id,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(differentSellerResult);
  // Seller A should only see their own snapshots, not seller B's
  // Verify all returned snapshots belong to seller A
  TestValidator.predicate(
    "all snapshots belong to seller A",
    differentSellerResult.data.every(
      (snapshot) => snapshot.ecommerce_mall_seller_id === sellerA.id,
    ),
  );
  // 4. Scenario 3: No seller_id parameter - seller A queries without specifying seller_id
  const noSellerIdResult =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerAConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(noSellerIdResult);
  // Should return seller A's own snapshots (default behavior)
  // 5. Scenario 4: Invalid seller_id format - seller A queries with malformed UUID
  await TestValidator.error(
    "invalid seller_id format returns validation error",
    async () => {
      await api.functional.ecommerceMall.seller.profile.snapshots.index(
        sellerAConnection,
        {
          body: {
            page: 1,
            limit: 100,
            seller_id: "not-a-valid-uuid-format",
          } satisfies IEcommerceMallShopProfile.IRequest,
        },
      );
    },
  );
  // 6. Scenario 5: Non-existent seller_id - seller A queries with valid UUID format for non-existent seller
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentResult =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerAConnection,
      {
        body: {
          page: 1,
          limit: 100,
          seller_id: nonExistentSellerId,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(nonExistentResult);
  // Should return empty list without error
  TestValidator.equals(
    "non-existent seller_id returns empty",
    nonExistentResult.data.length,
    0,
  );
}
