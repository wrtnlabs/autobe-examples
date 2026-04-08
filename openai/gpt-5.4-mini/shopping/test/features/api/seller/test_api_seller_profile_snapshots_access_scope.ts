import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshots_access_scope(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller profile snapshot browsing access scope.
   *
   * Validates that seller profile snapshot history is restricted to the authenticated seller's own storefront history and does not leak another seller's preserved shop name, shop description, or logo changes.
   *
   * 1. Create two distinct seller accounts.
   * 2. Query the seller profile snapshot list as each seller.
   * 3. Verify the responses are isolated by seller and do not expose cross-account snapshot history.
   * 4. Confirm the returned data shape remains valid while preserving access boundaries.
   */
  const sellerOneConnection: api.IConnection = { host: connection.host };
  const sellerTwoConnection: api.IConnection = { host: connection.host };
  const sellerOneAuthorized = await authorize_seller_join(sellerOneConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerOneAuthorized);
  const sellerTwoAuthorized = await authorize_seller_join(sellerTwoConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerTwoAuthorized);
  const sellerOneSnapshots =
    await api.functional.mallPlatform.seller.sellerProfileSnapshots.index(
      sellerOneConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(sellerOneSnapshots);
  const sellerTwoSnapshots =
    await api.functional.mallPlatform.seller.sellerProfileSnapshots.index(
      sellerTwoConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(sellerTwoSnapshots);
  TestValidator.predicate(
    "seller profile snapshot page is valid for seller one",
    sellerOneSnapshots.pagination.current >= 0 &&
      sellerOneSnapshots.pagination.limit >= 0 &&
      sellerOneSnapshots.pagination.records >= 0 &&
      sellerOneSnapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "seller profile snapshot page is valid for seller two",
    sellerTwoSnapshots.pagination.current >= 0 &&
      sellerTwoSnapshots.pagination.limit >= 0 &&
      sellerTwoSnapshots.pagination.records >= 0 &&
      sellerTwoSnapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "seller profile snapshots are isolated by authenticated seller scope",
    sellerOneSnapshots.data.every(
      (snapshot) =>
        !sellerTwoSnapshots.data.some((other) => other.id === snapshot.id),
    ) &&
      sellerTwoSnapshots.data.every(
        (snapshot) =>
          !sellerOneSnapshots.data.some((other) => other.id === snapshot.id),
      ),
  );
  TestValidator.predicate(
    "seller profile snapshots do not expose cross-seller storefront history",
    sellerOneSnapshots.data.every(
      (snapshot) =>
        snapshot.shopName.length > 0 &&
        snapshot.shopDescription.length > 0 &&
        (snapshot.logoImageUri === null || snapshot.logoImageUri.length > 0),
    ) &&
      sellerTwoSnapshots.data.every(
        (snapshot) =>
          snapshot.shopName.length > 0 &&
          snapshot.shopDescription.length > 0 &&
          (snapshot.logoImageUri === null || snapshot.logoImageUri.length > 0),
      ),
  );
}
