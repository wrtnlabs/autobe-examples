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
 * Verify that an administrator can read a seller's storefront identity snapshot history.
 *
 * This test covers the storefront identity snapshot audit flow for a seller account and confirms that administrator-level access can inspect immutable history records created by storefront edits. It validates both the seller-side snapshot creation path and the administrator-side read path so the platform preserves edit history for governance and dispute review.
 *
 * The test is organized around three business rules:
 * 1. A seller update creates immutable storefront identity snapshots.
 * 2. The snapshot history endpoint returns preserved storefront fields and seller profile summary references.
 * 3. Administrator access to another seller's snapshot history is read-only and does not mutate the seller profile.
 *
 * The scenario intentionally uses multiple storefront edits so the history response can be checked for correct pagination behavior and for the persistence of earlier storefront identity values.
 */
export async function test_api_seller_storefront_identity_snapshot_history_admin_access(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const firstShopName = `Shop-${RandomGenerator.alphabets(6)}`;
  const secondShopName = `Shop-${RandomGenerator.alphabets(6)}-${RandomGenerator.alphabets(3)}`;
  const thirdShopName = `Shop-${RandomGenerator.alphabets(6)}-${RandomGenerator.alphabets(3)}-${RandomGenerator.alphabets(3)}`;
  const firstDescription = RandomGenerator.paragraph({ sentences: 2 });
  const secondDescription = RandomGenerator.paragraph({ sentences: 3 });
  const thirdDescription = RandomGenerator.paragraph({ sentences: 4 });
  const firstProfile =
    await api.functional.mallPlatform.seller.storefront_identity.update(
      sellerConnection,
      {
        body: {
          shopName: firstShopName,
          shopDescription: firstDescription,
          logoImageUri: null,
        } satisfies IMallPlatformSellerProfile.IUpdate,
      },
    );
  typia.assert(firstProfile);
  const secondProfile =
    await api.functional.mallPlatform.seller.storefront_identity.update(
      sellerConnection,
      {
        body: {
          shopName: secondShopName,
          shopDescription: secondDescription,
          logoImageUri: null,
        } satisfies IMallPlatformSellerProfile.IUpdate,
      },
    );
  typia.assert(secondProfile);
  const thirdProfile =
    await api.functional.mallPlatform.seller.storefront_identity.update(
      sellerConnection,
      {
        body: {
          shopName: thirdShopName,
          shopDescription: thirdDescription,
          logoImageUri: null,
        } satisfies IMallPlatformSellerProfile.IUpdate,
      },
    );
  typia.assert(thirdProfile);
  TestValidator.notEquals(
    "storefront identity should change after first edit",
    firstProfile.shopName,
    secondProfile.shopName,
  );
  TestValidator.notEquals(
    "storefront identity should change after second edit",
    secondProfile.shopName,
    thirdProfile.shopName,
  );
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const snapshotPage =
    await api.functional.mallPlatform.seller.storefront_identity.snapshots.index(
      administratorConnection,
      {
        body: {
          page: 1,
          limit: 10,
          order: "desc",
        } satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  TestValidator.equals(
    "snapshot page current",
    snapshotPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "snapshot page limit",
    snapshotPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "snapshot page records should exist",
    snapshotPage.pagination.records >= 3,
  );
  TestValidator.predicate(
    "snapshot page pages should be positive",
    snapshotPage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "snapshot page should return records",
    snapshotPage.data.length > 0,
  );
  const latestSnapshot = snapshotPage.data[0];
  typia.assert(latestSnapshot);
  TestValidator.predicate(
    "snapshot seller profile reference should be preserved",
    latestSnapshot.sellerProfile !== null && latestSnapshot.sellerProfile !== undefined,
  );
  TestValidator.equals(
    "snapshot shop name should preserve latest storefront identity",
    latestSnapshot.shopName,
    thirdShopName,
  );
  TestValidator.equals(
    "snapshot shop description should preserve latest storefront identity",
    latestSnapshot.shopDescription,
    thirdDescription,
  );
  const hasEarlierSnapshot = ArrayUtil.has(
    snapshotPage.data,
    (snapshot) =>
      snapshot.shopName === firstShopName ||
      snapshot.shopName === secondShopName,
  );
  TestValidator.predicate(
    "history should include earlier storefront identities",
    hasEarlierSnapshot,
  );
  const repeatedPage =
    await api.functional.mallPlatform.seller.storefront_identity.snapshots.index(
      administratorConnection,
      {
        body: {
          page: 1,
          limit: 10,
          order: "desc",
        } satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(repeatedPage);
  TestValidator.equals(
    "snapshot history should be stable for read-only access",
    repeatedPage,
    snapshotPage,
  );
}
