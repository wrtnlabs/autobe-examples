import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_retrieve_seller_profile_multi_attribute_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  // 2. Generate snapshot parameters
  const profileId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve seller profile snapshot
  const snapshot =
    await api.functional.ecommercePlatform.admin.seller_profiles.snapshots.at(
      adminConnection,
      {
        profileId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate all three modified field pairs are non-null
  TestValidator.predicate(
    "shop name changed",
    snapshot.previousShopName !== null && snapshot.currentShopName !== null,
  );
  TestValidator.predicate(
    "shop description changed",
    snapshot.previousShopDescription !== null &&
      snapshot.currentShopDescription !== null,
  );
  TestValidator.predicate(
    "logo URI changed",
    snapshot.previousLogoUri !== null && snapshot.currentLogoUri !== null,
  );
  // 5. Validate snapshot metadata
  TestValidator.equals("entity type", snapshot.entityType, "seller_profile");
  TestValidator.predicate(
    "snapshot created timestamp exists",
    snapshot.snapshotCreatedAt !== undefined,
  );
  TestValidator.predicate(
    "seller profile ID exists",
    snapshot.sellerProfileId !== undefined,
  );
  TestValidator.predicate(
    "seller information exists",
    snapshot.seller !== undefined,
  );
}