import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerProfileSnapshotComparison } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshotComparison";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
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
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_seller_profile_snapshot_comparison_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Create seller registration (creates initial profile snapshot)
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {
        body: {
          taxIdentificationNumber: RandomGenerator.alphaNumeric(10),
          businessRegistrationNumber: RandomGenerator.alphaNumeric(10),
          businessName: RandomGenerator.name(),
          businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEcommerceMallSellerRegistration.ICreate,
      },
    );
  typia.assert(registration);
  // Extract registration ID
  const registrationId = (registration as any).id as string;
  TestValidator.predicate("registration has valid id", !!registrationId);
  // 4. Approve seller registration (may create additional snapshot)
  const approvedRegistration =
    await api.functional.ecommerceMall.admin.sellers.registrations.review(
      adminConnection,
      {
        registrationId: registrationId,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerRegistration.IReview,
      },
    );
  typia.assert(approvedRegistration);
  // 5. Retrieve profile snapshots to get snapshot IDs
  const snapshotsPage =
    await api.functional.ecommerceMall.admin.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          seller_id: seller.id,
          created_at_min: null,
          created_at_max: null,
          page: 1,
          limit: 10,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  // Verify at least 2 snapshots exist for comparison
  TestValidator.predicate(
    "at least two snapshots exist for comparison",
    snapshotsPage.data.length >= 2,
  );
  // Get two snapshot IDs for comparison
  const snapshotId = snapshotsPage.data[0].id;
  const otherSnapshotId = snapshotsPage.data[1].id;
  // 6. Compare the two snapshots
  const comparison =
    await api.functional.ecommerceMall.admin.sellers.profile.snapshots.compare.compareSnapshots(
      adminConnection,
      {
        sellerId: seller.id,
        snapshotId: snapshotId,
        otherSnapshotId: otherSnapshotId,
      },
    );
  typia.assert(comparison);
  // 7. Validate comparison result
  TestValidator.equals(
    "snapshot id matches",
    comparison.snapshot.id,
    snapshotId,
  );
  TestValidator.equals(
    "other snapshot id matches",
    comparison.otherSnapshot.id,
    otherSnapshotId,
  );
  TestValidator.equals(
    "snapshot shop name matches",
    comparison.snapshot.shopName,
    snapshotsPage.data[0].shopName,
  );
  TestValidator.equals(
    "other snapshot shop name matches",
    comparison.otherSnapshot.shopName,
    snapshotsPage.data[1].shopName,
  );
  TestValidator.equals(
    "snapshot created at matches",
    comparison.snapshot.createdAt,
    snapshotsPage.data[0].createdAt,
  );
  TestValidator.equals(
    "other snapshot created at matches",
    comparison.otherSnapshot.createdAt,
    snapshotsPage.data[1].createdAt,
  );
}
