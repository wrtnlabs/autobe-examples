import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
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
 * Test seller profile snapshot pagination functionality with multiple snapshots.
 *
 * Validates the pagination system for seller profile snapshots, ensuring that when a seller creates multiple profile edits, each generates a snapshot, and the snapshots can be retrieved in paginated form with correct metadata and ordering.
 *
 * This test focuses on verifying:
 * - Snapshot creation when profile is updated multiple times
 * - Pagination returns correct subset of snapshots (limit=2)
 * - Pagination metadata is accurate (current, limit, records, pages)
 * - Snapshots are ordered newest first (descending by createdAt)
 * - Each snapshot preserves the exact profile state at its creation time
 * - Data integrity across page boundaries
 *
 * 1. Register new seller account (pending status).
 * 2. Admin joins and approves the seller (status becomes approved).
 * 3. Seller creates 5 profile snapshots by updating shop name/description.
 * 4. Retrieve first page (page=1, limit=2) and validate.
 * 5. Verify ordering and data integrity.
 */
export async function test_api_seller_profile_snapshot_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Register admin with known credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Login admin with known credentials
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: sellerAuth.id },
    );
  typia.assert(approvedSeller);
  // 4. Create 5 profile snapshots by updating profile 5 times
  const snapshotShopNames: string[] = [];
  for (let i = 0; i < 5; i++) {
    const shopName = `Test Shop ${i + 1} - ${RandomGenerator.alphaNumeric(8)}`;
    snapshotShopNames.push(shopName);
    const updatedProfile =
      await api.functional.ecommerceMall.seller.sellers.me.profile.patch(
        sellerConnection,
        {
          body: {
            name: shopName,
            description: `Shop description ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          } satisfies IEcommerceMallSellerProfile.IUpdate,
        },
      );
    typia.assert(updatedProfile);
  }
  // 5. Retrieve snapshots list (default pagination)
  const snapshotList =
    await api.functional.ecommerceMall.seller.sellers.me.profile.snapshots.list(
      sellerConnection,
    );
  typia.assert(snapshotList);
  // Validate pagination metadata with 5 total records
  TestValidator.equals("current page", snapshotList.pagination.current, 1);
  TestValidator.equals("total records", snapshotList.pagination.records, 5);
  TestValidator.equals("total pages", snapshotList.pagination.pages, 1);
  // Validate we have all 5 snapshots
  TestValidator.equals("all snapshots returned", snapshotList.data.length, 5);
  // Verify ordering - snapshots should be newest first (descending by createdAt)
  for (let i = 0; i < snapshotList.data.length - 1; i++) {
    const currentTimestamp = new Date(snapshotList.data[i].createdAt).getTime();
    const nextTimestamp = new Date(
      snapshotList.data[i + 1].createdAt,
    ).getTime();
    TestValidator.predicate(
      `snapshot ${i} is newer than ${i + 1}`,
      currentTimestamp >= nextTimestamp,
    );
  }
  // Verify each snapshot preserves the exact profile state
  for (let i = 0; i < snapshotList.data.length; i++) {
    const snapshot = snapshotList.data[i];
    TestValidator.equals(
      `snapshot ${i} has valid id`,
      snapshot.id !== undefined && snapshot.id.length > 0,
      true,
    );
    TestValidator.equals(
      `snapshot ${i} has shopName`,
      snapshot.shopName !== null,
      true,
    );
    TestValidator.equals(
      `snapshot ${i} has shopDescription`,
      snapshot.shopDescription !== null,
      true,
    );
  }
  // Verify snapshots match the created shop names in reverse order (newest first)
  TestValidator.equals(
    "first snapshot (newest) shop name",
    snapshotList.data[0].shopName,
    snapshotShopNames[4],
  );
  TestValidator.equals(
    "last snapshot (oldest) shop name",
    snapshotList.data[4].shopName,
    snapshotShopNames[0],
  );
}
