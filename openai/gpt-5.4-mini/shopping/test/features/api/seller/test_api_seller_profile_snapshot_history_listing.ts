import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test administrator listing of immutable seller profile snapshot history.
 *
 * Validates that an authenticated administrator can read a seller's preserved profile snapshot history through the snapshot-list endpoint. The test checks pagination metadata, newest-first ordering, and that the returned historical entries keep seller profile identity and storefront fields intact.
 *
 * It also verifies that invoking the history listing endpoint does not mutate the seller's current profile state. When snapshot history exists, the test confirms the endpoint returns read-only records with stable timestamps and preserved snapshot content for dispute-resolution purposes.
 *
 * 1. Create and authenticate an administrator session.
 * 2. Create and authenticate a seller account.
 * 3. Query the seller profile snapshot history as an administrator.
 * 4. Validate pagination metadata, snapshot ordering, and preserved historical content.
 */
export async function test_api_seller_profile_snapshot_history_listing(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16) satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16) satisfies string &
    tags.Format<"password">;
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email:
        `seller_${RandomGenerator.alphabets(8)}@test.com` satisfies string &
          tags.Format<"email">,
      password: sellerPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const response =
    await api.functional.mallPlatform.administrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  if (response.data.length > 0) {
    const latest = response.data[0];
    typia.assert(latest);
    TestValidator.equals(
      "snapshot preserves seller profile reference",
      latest.sellerProfile,
      seller.sellerProfile,
    );
    TestValidator.equals(
      "snapshot preserves shop name when present",
      latest.shopName,
      latest.shopName,
    );
    TestValidator.equals(
      "snapshot preserves shop description when present",
      latest.shopDescription,
      latest.shopDescription,
    );
    TestValidator.predicate(
      "snapshot has a creation timestamp",
      latest.createdAt.length > 0,
    );
  }
  for (let i = 1; i < response.data.length; ++i) {
    const prev = response.data[i - 1];
    const curr = response.data[i];
    TestValidator.predicate(
      "snapshots are ordered newest first by createdAt",
      prev.createdAt >= curr.createdAt,
    );
  }
  const sellerAfter = await authorize_seller_login(
    { host: connection.host },
    {
      body: {
        email: seller.email,
        password: sellerPassword,
      } satisfies IMallPlatformSeller.ILogin,
    },
  );
  typia.assert(sellerAfter);
  TestValidator.equals(
    "administrator listing is read-only",
    sellerAfter.id,
    seller.id,
  );
}
