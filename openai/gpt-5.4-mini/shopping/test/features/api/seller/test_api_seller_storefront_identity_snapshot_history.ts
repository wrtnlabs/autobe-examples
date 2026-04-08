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

export async function test_api_seller_storefront_identity_snapshot_history(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const shopName1 = `Shop ${RandomGenerator.alphabets(6)}`;
  const shopDescription1 = RandomGenerator.paragraph({ sentences: 2 });
  const logoImageUri1 = `https://example.com/${RandomGenerator.alphaNumeric(8)}.png`;
  const profile1 =
    await api.functional.mallPlatform.seller.storefront_identity.update(
      sellerConnection,
      {
        body: {
          shopName: shopName1,
          shopDescription: shopDescription1,
          logoImageUri: logoImageUri1,
        } satisfies IMallPlatformSellerProfile.IUpdate,
      },
    );
  typia.assert(profile1);
  const shopName2 = `Shop ${RandomGenerator.alphabets(6)} ${RandomGenerator.alphabets(3)}`;
  const shopDescription2 = RandomGenerator.paragraph({ sentences: 3 });
  const logoImageUri2 = `https://example.com/${RandomGenerator.alphaNumeric(8)}-2.png`;
  const profile2 =
    await api.functional.mallPlatform.seller.storefront_identity.update(
      sellerConnection,
      {
        body: {
          shopName: shopName2,
          shopDescription: shopDescription2,
          logoImageUri: logoImageUri2,
        } satisfies IMallPlatformSellerProfile.IUpdate,
      },
    );
  typia.assert(profile2);
  const shopName3 = `Shop ${RandomGenerator.alphabets(6)} ${RandomGenerator.alphabets(3)} ${RandomGenerator.alphabets(3)}`;
  const shopDescription3 = RandomGenerator.paragraph({ sentences: 4 });
  const logoImageUri3 = `https://example.com/${RandomGenerator.alphaNumeric(8)}-3.png`;
  const profile3 =
    await api.functional.mallPlatform.seller.storefront_identity.update(
      sellerConnection,
      {
        body: {
          shopName: shopName3,
          shopDescription: shopDescription3,
          logoImageUri: logoImageUri3,
        } satisfies IMallPlatformSellerProfile.IUpdate,
      },
    );
  typia.assert(profile3);
  const snapshots =
    await api.functional.mallPlatform.seller.storefront_identity.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.equals(
    "snapshot page current should be 1",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "snapshot page limit should match request",
    snapshots.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "snapshot pagination records should be non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot pagination pages should be non-negative",
    snapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot list should contain historical entries after multiple edits",
    snapshots.data.length >= 2,
  );
  const firstSnapshot = snapshots.data[0];
  const secondSnapshot = snapshots.data[1];
  TestValidator.predicate(
    "snapshots should be ordered newest first by default",
    firstSnapshot.createdAt >= secondSnapshot.createdAt,
  );
  TestValidator.equals(
    "latest snapshot should preserve the most recent shop name",
    firstSnapshot.shopName,
    shopName3,
  );
  TestValidator.equals(
    "latest snapshot should preserve the most recent shop description",
    firstSnapshot.shopDescription,
    shopDescription3,
  );
  TestValidator.equals(
    "latest snapshot should preserve the most recent logo image uri",
    firstSnapshot.logoImageUri,
    logoImageUri3,
  );
  TestValidator.equals(
    "previous snapshot should preserve the prior shop name",
    secondSnapshot.shopName,
    shopName2,
  );
  TestValidator.equals(
    "previous snapshot should preserve the prior shop description",
    secondSnapshot.shopDescription,
    shopDescription2,
  );
  TestValidator.equals(
    "previous snapshot should preserve the prior logo image uri",
    secondSnapshot.logoImageUri,
    logoImageUri2,
  );
  TestValidator.predicate(
    "latest snapshot should have a createdAt timestamp",
    firstSnapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "previous snapshot should have a createdAt timestamp",
    secondSnapshot.createdAt.length > 0,
  );
}
