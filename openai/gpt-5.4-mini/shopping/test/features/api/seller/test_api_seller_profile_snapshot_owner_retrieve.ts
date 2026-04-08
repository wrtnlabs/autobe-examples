import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
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

export async function test_api_seller_profile_snapshot_owner_retrieve(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const sellerId: string = seller.id;
  const liveProfile = seller.sellerProfile;
  TestValidator.predicate(
    "seller join should provide a current profile for snapshot validation",
    liveProfile !== null,
  );
  if (liveProfile === null) return;
  const snapshotId: string = liveProfile.id;
  const snapshot =
    await api.functional.mallPlatform.administrator.sellers.profile.snapshots.at(
      sellerConnection,
      {
        sellerId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot seller profile matches the owning seller profile",
    snapshot.sellerProfile,
    liveProfile,
  );
  TestValidator.equals(
    "snapshot shop name matches the current seller profile",
    snapshot.shopName,
    liveProfile.shopName,
  );
  TestValidator.equals(
    "snapshot shop description matches the current seller profile",
    snapshot.shopDescription,
    liveProfile.shopDescription,
  );
  const liveLogoImageUri = liveProfile.logoImageUri;
  TestValidator.equals(
    "snapshot logo image URI matches the current seller profile",
    snapshot.logoImageUri,
    liveLogoImageUri === null
      ? null
      : (liveLogoImageUri as string & tags.Format<"url">),
  );
  TestValidator.equals(
    "snapshot createdAt is preserved from the live profile state",
    snapshot.createdAt,
    liveProfile.createdAt,
  );
}
