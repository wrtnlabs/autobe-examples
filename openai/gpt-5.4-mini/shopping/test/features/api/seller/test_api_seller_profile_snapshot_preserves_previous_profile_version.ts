import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_preserves_previous_profile_version(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email:
        `seller-${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
          tags.Format<"email">,
      password: `Pwd${RandomGenerator.alphaNumeric(12)}!` satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const snapshotId = authorized.sellerProfile.id;
  const firstSnapshot =
    await api.functional.mallPlatform.seller.sellerProfileSnapshots.at(
      sellerConnection,
      {
        sellerProfileSnapshotId: snapshotId,
      },
    );
  typia.assert(firstSnapshot);
  const secondSnapshot =
    await api.functional.mallPlatform.seller.sellerProfileSnapshots.at(
      sellerConnection,
      {
        sellerProfileSnapshotId: snapshotId,
      },
    );
  typia.assert(secondSnapshot);
  TestValidator.equals(
    "snapshot id remains stable",
    secondSnapshot.id,
    firstSnapshot.id,
  );
  TestValidator.equals(
    "snapshot owner summary remains stable",
    secondSnapshot.sellerProfile,
    firstSnapshot.sellerProfile,
  );
  TestValidator.equals(
    "shop name remains stable",
    secondSnapshot.shopName,
    firstSnapshot.shopName,
  );
  TestValidator.equals(
    "shop description remains stable",
    secondSnapshot.shopDescription,
    firstSnapshot.shopDescription,
  );
  TestValidator.equals(
    "logo image uri remains stable",
    secondSnapshot.logoImageUri,
    firstSnapshot.logoImageUri,
  );
  TestValidator.equals(
    "createdAt remains stable",
    secondSnapshot.createdAt,
    firstSnapshot.createdAt,
  );
}
