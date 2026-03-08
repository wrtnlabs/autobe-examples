import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first seller account
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(seller1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(seller1Auth);
  // 2. Query snapshots for first seller
  const seller1Snapshots: IPageIEcommerceMallSellerSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      seller1Connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerSnapshot.IRequest,
      },
    );
  typia.assert(seller1Snapshots);
  // 3. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    seller1Snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    seller1Snapshots.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination has records",
    seller1Snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    seller1Snapshots.pagination.pages >= 0,
  );
  // 4. Verify snapshot structure if any exist
  if (seller1Snapshots.data.length > 0) {
    const snapshot = seller1Snapshots.data[0];
    TestValidator.predicate("snapshot has id", snapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot has changed_by",
      snapshot.changed_by !== undefined,
    );
    TestValidator.predicate(
      "snapshot has previous_values",
      snapshot.previous_values !== undefined,
    );
    TestValidator.predicate(
      "snapshot has current_values",
      snapshot.current_values !== undefined,
    );
    // Verify sorting (newest first)
    for (let i = 1; i < seller1Snapshots.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} is older than snapshot ${i - 1}`,
        seller1Snapshots.data[i].created_at <=
          seller1Snapshots.data[i - 1].created_at,
      );
    }
  }
  // 5. Create second seller account for data isolation test
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(seller2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(seller2Auth);
  // 6. Query snapshots for second seller
  const seller2Snapshots: IPageIEcommerceMallSellerSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      seller2Connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerSnapshot.IRequest,
      },
    );
  typia.assert(seller2Snapshots);
  // 7. Verify data isolation - seller2 should not see seller1's snapshots
  // Both should have same count (typically 0 or same initial snapshots)
  TestValidator.equals(
    "seller2 cannot see seller1's snapshots",
    seller2Snapshots.data.length,
    seller1Snapshots.data.length,
  );
}
