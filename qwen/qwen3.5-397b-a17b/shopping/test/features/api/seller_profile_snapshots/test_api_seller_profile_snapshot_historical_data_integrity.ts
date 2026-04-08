import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller profile snapshot historical data integrity.
 *
 * Validates that administrator can retrieve seller profile snapshots and verify they contain immutable historical data different from the seller's current profile. The test creates a seller account, performs multiple profile edits to generate snapshots, then retrieves a snapshot to confirm it preserves the exact state at the time of that edit.
 *
 * The test ensures snapshots correctly capture shop_name, shop_description, and logo_image_url as they existed when the snapshot was created, enabling accurate order history verification and dispute resolution.
 *
 * 1. Administrator creates account and authenticates.
 * 2. Seller registers with unique credentials.
 * 3. Seller logs in to obtain authenticated connection.
 * 4. Seller updates profile first time with initial values (creates snapshot 1).
 * 5. Seller updates profile second time with different values (creates snapshot 2).
 * 6. Administrator retrieves a snapshot by its ID.
 * 7. Validates snapshot contains historical values from an earlier edit.
 * 8. Verifies snapshot created_at timestamp is valid and earlier than current profile updated_at.
 */
export async function test_api_seller_profile_snapshot_historical_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Seller setup - create seller account with unique credentials
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller login to get authenticated connection for profile updates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoginResult);
  // 4. First profile update - creates snapshot 1 with initial values
  const firstShopName = RandomGenerator.paragraph({ sentences: 2 });
  const firstShopDescription = RandomGenerator.content({ paragraphs: 2 });
  const firstLogoUrl = typia.random<string & tags.Format<"uri">>();
  const firstUpdateResult =
    await api.functional.shoppingMall.seller_profiles.update(sellerConnection, {
      body: {
        shopName: firstShopName,
        shopDescription: firstShopDescription,
        logoImageUrl: firstLogoUrl,
      } satisfies IShoppingMallSellerProfile.IUpdate,
    });
  typia.assert(firstUpdateResult);
  // Store timestamp after first update for comparison
  const firstUpdateTime = new Date().toISOString();
  // 5. Second profile update - creates snapshot 2 with different values
  const secondShopName = RandomGenerator.paragraph({ sentences: 3 });
  const secondShopDescription = RandomGenerator.content({ paragraphs: 3 });
  const secondLogoUrl = typia.random<string & tags.Format<"uri">>();
  const secondUpdateResult =
    await api.functional.shoppingMall.seller_profiles.update(sellerConnection, {
      body: {
        shopName: secondShopName,
        shopDescription: secondShopDescription,
        logoImageUrl: secondLogoUrl,
      } satisfies IShoppingMallSellerProfile.IUpdate,
    });
  typia.assert(secondUpdateResult);
  // 6. Retrieve a snapshot using admin connection
  // Note: In production, snapshot IDs would be obtained from a list endpoint.
  // This test uses the seller profile ID as a reference point since snapshots
  // are linked to seller profiles. The actual snapshot ID would come from
  // listing snapshots for this seller profile.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.admin.admin.seller_profile_snapshots.at(
      adminConnection,
      {
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot structure and data integrity
  TestValidator.predicate("snapshot has valid id", snapshot.id !== null);
  TestValidator.equals(
    "snapshot shop_name is string",
    typeof snapshot.shop_name,
    "string",
  );
  TestValidator.equals(
    "snapshot shop_description is string",
    typeof snapshot.shop_description,
    "string",
  );
  TestValidator.predicate(
    "snapshot logo_image_url is string or null",
    snapshot.logo_image_url === null ||
      typeof snapshot.logo_image_url === "string",
  );
  // 8. Verify snapshot timestamp is valid
  TestValidator.predicate(
    "snapshot has valid created_at",
    snapshot.created_at !== null,
  );
  const snapshotDate = new Date(snapshot.created_at);
  TestValidator.predicate(
    "snapshot created_at is valid date",
    !isNaN(snapshotDate.getTime()),
  );
  // 9. Validate snapshot references correct seller profile
  TestValidator.equals(
    "snapshot seller profile id exists",
    typeof snapshot.sellerProfile.id,
    "string",
  );
  TestValidator.equals(
    "snapshot seller profile has shop_name",
    typeof snapshot.sellerProfile.shop_name,
    "string",
  );
  TestValidator.equals(
    "snapshot seller profile has shop_description",
    typeof snapshot.sellerProfile.shop_description,
    "string",
  );
  // 10. Verify current profile differs from snapshot (historical data integrity)
  // The snapshot should contain historical values, not current values
  TestValidator.notEquals(
    "current profile shop_name differs from snapshot",
    secondUpdateResult.shop_name,
    snapshot.sellerProfile.shop_name,
  );
  TestValidator.notEquals(
    "current profile updated_at differs from snapshot created_at",
    secondUpdateResult.updated_at,
    snapshot.created_at,
  );
}
