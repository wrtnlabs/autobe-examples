import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_seller_profile_snapshot_empty_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account (no profile updates, so no snapshots)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Call PATCH /ecommerceMall/seller/profile/snapshots with default pagination
  const snapshotsPage =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  // 3. Verify response returns empty data array
  TestValidator.equals("data array should be empty", snapshotsPage.data, []);
  // 4. Verify pagination metadata shows records=0, pages=0
  TestValidator.equals(
    "records should be 0",
    snapshotsPage.pagination.records,
    0,
  );
  TestValidator.equals("pages should be 0", snapshotsPage.pagination.pages, 0);
  // 5. Verify response has valid pagination structure
  TestValidator.predicate(
    "current page should be valid",
    snapshotsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be valid",
    snapshotsPage.pagination.limit > 0,
  );
}
