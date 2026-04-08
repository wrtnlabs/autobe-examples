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

export async function test_api_seller_profile_snapshot_retrieve(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator retrieval of an immutable seller profile snapshot.
   *
   * Validates that an administrator can authenticate, fetch a seller profile
   * snapshot by identifier, and observe the preserved storefront history fields
   * exactly as stored in the snapshot record.
   *
   * 1. Register and authenticate an administrator through the required join flow.
   * 2. Retrieve an existing seller profile snapshot by its UUID identifier.
   * 3. Validate the returned snapshot preserves the immutable historical state.
   * 4. Confirm the response exposes the owning seller profile summary and createdAt timestamp.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
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
  TestValidator.equals("snapshot id", snapshot.id, snapshotId);
  TestValidator.predicate(
    "seller profile summary exists",
    snapshot.sellerProfile !== null && snapshot.sellerProfile !== undefined,
  );
  TestValidator.predicate("shop name captured", snapshot.shopName.length > 0);
  TestValidator.predicate(
    "shop description captured",
    snapshot.shopDescription.length > 0,
  );
  TestValidator.predicate("createdAt captured", snapshot.createdAt.length > 0);
  TestValidator.predicate(
    "logo image uri is nullable or populated",
    snapshot.logoImageUri === null || snapshot.logoImageUri.length > 0,
  );
}
