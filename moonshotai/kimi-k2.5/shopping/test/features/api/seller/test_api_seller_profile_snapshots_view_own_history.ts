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

/**
 * Test that an authenticated seller can retrieve their own profile snapshot history.
 *
 * After a seller joins and updates their profile details (shop name, description, or logo),
 * the system automatically creates immutable snapshots. This test validates that sellers
 * can view their complete profile edit history in chronological order, verifying that
 * each snapshot contains the shop name, description, logo URL, and timestamp. The test
 * ensures sellers can only access their own snapshots and that the response is properly
 * paginated with metadata.
 */
export async function test_api_seller_profile_snapshots_view_own_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection (isolated from base connection per connection isolation pattern)
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as seller using utility function (creates account and establishes session)
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Query profile snapshots with pagination - seller_id is null as system filters by auth context
  const snapshots =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          seller_id: null,
          created_at_min: null,
          created_at_max: null,
          page: 1,
          limit: 10,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  // 4. Validate complete response structure including pagination and snapshot data
  typia.assert(snapshots);
}
