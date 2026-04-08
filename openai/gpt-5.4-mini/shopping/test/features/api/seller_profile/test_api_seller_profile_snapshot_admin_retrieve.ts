import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
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

export async function test_api_seller_profile_snapshot_admin_retrieve(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const snapshot =
    await api.functional.mallPlatform.administrator.sellers.profile.snapshots.at(
      adminConnection,
      {
        sellerId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot id should be preserved",
    snapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "seller profile reference should be preserved",
    snapshot.sellerProfile,
    snapshot.sellerProfile,
  );
  TestValidator.equals(
    "shop name should be preserved",
    snapshot.shopName,
    snapshot.shopName,
  );
  TestValidator.equals(
    "shop description should be preserved",
    snapshot.shopDescription,
    snapshot.shopDescription,
  );
  TestValidator.equals(
    "logo image uri should be preserved",
    snapshot.logoImageUri,
    snapshot.logoImageUri,
  );
  TestValidator.equals(
    "createdAt should be preserved",
    snapshot.createdAt,
    snapshot.createdAt,
  );
}
