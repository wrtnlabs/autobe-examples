import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an administrator viewing snapshot history for a never-edited seller profile receives an empty result set with correct pagination metadata.
 *
 * Validates the snapshot listing endpoint's behavior when a seller profile exists but has never been modified after initial creation. Since snapshots are only created on profile edits, a brand-new profile should have zero snapshots — the API must return an empty data array rather than an error.
 *
 * Also verifies that pagination metadata accurately reflects the empty result state by explicitly requesting page 1 with a limit of 10. The pagination object must report 0 total records, 0 total pages, the requested current page, and the requested limit.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. Seller registers via authorize_seller_join, creating a profile with null fields.
 * 3. Administrator queries snapshots using the seller's profile ID with page=1, limit=10.
 * 4. Validates empty data array and correct pagination metadata.
 */
export async function test_api_seller_profile_snapshots_admin_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration — creates a fresh profile with no edits
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Admin queries snapshot history for the brand-new profile
  const snapshotPage =
    await api.functional.shoppingMall.admin.profiles.snapshots.index(
      adminConnection,
      {
        profileId: seller.profile.id,
        body: {
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 10 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // 4. Validate empty result and pagination metadata
  TestValidator.equals("data is empty", snapshotPage.data.length, 0);
  TestValidator.equals(
    "total records is zero",
    snapshotPage.pagination.records,
    0,
  );
  TestValidator.equals("total pages is zero", snapshotPage.pagination.pages, 0);
  TestValidator.equals(
    "current page matches request",
    snapshotPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    snapshotPage.pagination.limit,
    10,
  );
}
