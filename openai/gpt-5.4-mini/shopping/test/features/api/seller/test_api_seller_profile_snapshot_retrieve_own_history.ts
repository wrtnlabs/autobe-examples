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

export async function test_api_seller_profile_snapshot_retrieve_own_history(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(joined);
  const output =
    await api.functional.mallPlatform.seller.sellers.profile.snapshots.at(
      sellerConnection,
      {
        sellerId: joined.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "snapshot seller profile owner",
    output.sellerProfile,
    joined.sellerProfile!,
  );
  TestValidator.equals(
    "snapshot shop name is historical record",
    output.shopName,
    output.shopName,
  );
  TestValidator.equals(
    "snapshot shop description is historical record",
    output.shopDescription,
    output.shopDescription,
  );
  TestValidator.equals(
    "snapshot logo uri is historical record",
    output.logoImageUri,
    output.logoImageUri,
  );
}
