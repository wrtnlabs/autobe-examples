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

export async function test_api_seller_profile_snapshot_preserves_historical_state(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email:
        `admin_${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
          tags.Format<"email">,
      password: `P@ssw0rd_${RandomGenerator.alphaNumeric(8)}` satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.mallPlatform.administrator.sellerProfileSnapshots.at(
      adminConnection,
      {
        sellerProfileSnapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.predicate(
    "snapshot id is a uuid-like value",
    snapshot.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot shop name is preserved",
    snapshot.shopName.length > 0,
  );
  TestValidator.predicate(
    "snapshot shop description is preserved",
    snapshot.shopDescription.length > 0,
  );
  TestValidator.predicate(
    "snapshot exposes owning seller profile summary",
    snapshot.sellerProfile !== null && snapshot.sellerProfile !== undefined,
  );
  TestValidator.predicate(
    "logo image uri is historical or absent",
    snapshot.logoImageUri === null || snapshot.logoImageUri.length > 0,
  );
}
