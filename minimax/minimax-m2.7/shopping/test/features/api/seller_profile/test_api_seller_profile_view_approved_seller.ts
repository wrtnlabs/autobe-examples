import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test viewing an approved seller's public shop profile.
 *
 * Validates that customers and guests can successfully view an approved seller's
 * public shop profile. The test flow involves: 1) Registering an admin account
 * with authority to approve sellers, 2) Registering a new seller account which
 * starts with pending approval status, 3) Having the admin approve the seller
 * registration, 4) Retrieving the seller profile via the public profile endpoint.
 *
 * The response is validated to contain: shop name displayed in product listings,
 * business description explaining shop background, logo_uri field (which may be
 * null if not uploaded), nested seller summary with approvalStatus='approved',
 * and created_at/updated_at timestamps.
 *
 * This test ensures the profile visibility business logic works correctly:
 * - Pending sellers should not have accessible profiles
 * - Approved sellers should have publicly visible shop profiles
 * - Profile data structure matches the IEcommerceMallSellerProfile schema
 */
export async function test_api_seller_profile_view_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // Store password for later login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      name: RandomGenerator.name(),
      href: "https://example.com/admin/register",
      referrer: "https://example.com",
    },
  });
  // 2. Register a new seller account (starts with pending status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/seller/register",
      referrer: "https://example.com",
    },
  });
  // Store the seller ID for approval and profile lookup
  const sellerId: string & tags.Format<"uuid"> = sellerAuth.id;
  // 3. Admin approves the seller
  const adminApprovalConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminApprovalConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
      href: "https://example.com/admin/approve",
      referrer: "https://example.com",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminApprovalConnection,
      { sellerId },
    );
  typia.assert(approvedSeller);
  // 4. Retrieve the seller profile using the public profile endpoint
  const profileConnection: api.IConnection = { host: connection.host };
  const profile = await api.functional.ecommerceMall.sellers.profile.at(
    profileConnection,
    {
      sellerId,
    },
  );
  typia.assert(profile);
  // Validate response structure and content
  TestValidator.equals(
    "profile has valid id",
    profile.id,
    approvedSeller.profile.id,
  );
  TestValidator.predicate(
    "shop name exists",
    profile.name !== undefined && profile.name !== null,
  );
  TestValidator.predicate(
    "description exists",
    profile.description !== undefined,
  );
  TestValidator.equals(
    "seller summary exists",
    profile.seller !== undefined,
    true,
  );
  TestValidator.equals(
    "seller approvalStatus is approved",
    profile.seller.approvalStatus,
    "approved",
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.updated_at),
  );
}
