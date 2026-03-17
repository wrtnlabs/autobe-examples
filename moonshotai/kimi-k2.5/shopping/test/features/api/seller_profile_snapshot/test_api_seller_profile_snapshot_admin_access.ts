import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
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
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

/**
 * Test that an administrator can view profile snapshots for any seller on the platform.
 * This validates oversight capabilities essential for dispute resolution and shop verification.
 *
 * Test Steps:
 * 1. Authenticate as superAdmin (needed for seller approval authority)
 * 2. Register a target seller account and submit seller registration
 * 3. Approve the seller registration using superAdmin authority - this creates the initial seller profile snapshot
 * 4. Authenticate as a separate administrator who will inspect the snapshots
 * 5. Call PATCH /ecommerceMall/admin/sellers/{sellerId}/profile/snapshots targeting the other seller's sellerId
 * 6. Request body includes: created_at_min and created_at_max filters to test time-range filtering, pagination with page and limit parameters
 * 7. Verify administrator successfully retrieves the target seller's complete snapshot history
 */
export async function test_api_seller_profile_snapshot_admin_access(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as superAdmin (for approval authority)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphabets(12);
  // First create superAdmin using join (since we need to create one)
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null | undefined>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // Then login as superAdmin
  const superAdmin = await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IEcommerceMallSuperAdmin.ILogin,
  });
  typia.assert(superAdmin);
  // 2. Create target seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  typia.assert(seller);
  // 3. Submit seller registration (creates pending registration)
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  // 4. Approve seller registration using superAdmin - this creates initial profile snapshot
  const registrationId = (registration as IEntity).id;
  const approvedRegistration =
    await api.functional.ecommerceMall.superAdmin.sellers.registrations.review(
      superAdminConnection,
      {
        registrationId: registrationId,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerRegistration.IReview,
      },
    );
  typia.assert(approvedRegistration);
  // 5. Authenticate as separate administrator (inspector)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null | undefined>(),
    },
  });
  typia.assert(admin);
  // 6. Get seller profile snapshots using admin access with filters
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const snapshotRequest: IEcommerceMallSellerProfileSnapshot.IRequest = {
    seller_id: seller.id,
    created_at_min: yesterday.toISOString(),
    created_at_max: tomorrow.toISOString(),
    page: 1,
    limit: 10,
    sort: "created_at_desc",
  };
  const snapshots =
    await api.functional.ecommerceMall.admin.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: snapshotRequest,
      },
    );
  typia.assert(snapshots);
  // 7. Validate snapshot response structure and content
  TestValidator.predicate(
    "snapshots data is array",
    Array.isArray(snapshots.data),
  );
  TestValidator.predicate(
    "pagination exists",
    snapshots.pagination !== null && snapshots.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has valid pagination limit",
    snapshots.pagination.limit > 0,
  );
  // Validate snapshot data integrity if any snapshots exist
  if (snapshots.data.length > 0) {
    const snapshot = snapshots.data[0];
    TestValidator.predicate(
      "snapshot has valid id",
      typeof snapshot.id === "string" && snapshot.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot has shopName",
      typeof snapshot.shopName === "string",
    );
    TestValidator.predicate(
      "snapshot has createdAt",
      typeof snapshot.createdAt === "string",
    );
  }
}
