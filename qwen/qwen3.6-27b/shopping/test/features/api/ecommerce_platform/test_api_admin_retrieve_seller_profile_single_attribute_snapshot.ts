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

export async function test_api_admin_retrieve_seller_profile_single_attribute_snapshot(
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
  // 2. Retrieve seller profile snapshot
  const profileId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommercePlatform.admin.seller_profiles.snapshots.at(
      adminConnection,
      {
        profileId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 3. Validate snapshot header metadata
  TestValidator.equals(
    "entityType is seller_profile",
    snapshot.entityType,
    "seller_profile",
  );
  TestValidator.predicate(
    "snapshotCreatedAt is valid ISO date-time",
    snapshot.snapshotCreatedAt.includes("T"),
  );
  // 4. Validate seller information is present
  typia.assert(snapshot.seller);
  TestValidator.equals(
    "seller profile ID matches request",
    snapshot.sellerProfileId,
    profileId,
  );
  TestValidator.equals(
    "seller ID format is valid",
    snapshot.seller.id.length,
    36,
  );
  // 5. Validate shop name fields are populated (the only attribute that was modified)
  TestValidator.predicate(
    "previousShopName is defined",
    snapshot.previousShopName !== null,
  );
  TestValidator.predicate(
    "currentShopName is defined",
    snapshot.currentShopName !== null,
  );
  TestValidator.notEquals(
    "shop name values differ",
    snapshot.previousShopName,
    snapshot.currentShopName,
  );
  // 6. Validate unchanged fields are null
  TestValidator.equals(
    "previousShopDescription is null",
    snapshot.previousShopDescription,
    null,
  );
  TestValidator.equals(
    "currentShopDescription is null",
    snapshot.currentShopDescription,
    null,
  );
  TestValidator.equals(
    "previousLogoUri is null",
    snapshot.previousLogoUri,
    null,
  );
  TestValidator.equals("currentLogoUri is null", snapshot.currentLogoUri, null);
}
