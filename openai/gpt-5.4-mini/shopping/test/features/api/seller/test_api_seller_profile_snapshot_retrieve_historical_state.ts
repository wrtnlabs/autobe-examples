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

export async function test_api_seller_profile_snapshot_retrieve_historical_state(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const snapshot =
    await api.functional.mallPlatform.seller.sellerProfileSnapshots.at(
      sellerConnection,
      {
        sellerProfileSnapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.predicate(
    "snapshot id must be a uuid string",
    snapshot.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot shop name must be preserved",
    snapshot.shopName.length > 0,
  );
  TestValidator.predicate(
    "snapshot shop description must be preserved",
    snapshot.shopDescription.length > 0,
  );
  TestValidator.predicate(
    "snapshot createdAt must be a timestamp string",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot seller profile summary must exist",
    snapshot.sellerProfile !== null && snapshot.sellerProfile !== undefined,
  );
  TestValidator.predicate(
    "snapshot logo image uri must be nullable or a string reference",
    snapshot.logoImageUri === null || snapshot.logoImageUri.length > 0,
  );
}
