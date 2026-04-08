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
import { generate_random_ecommerce_mall_admin_admin_sellers_suspend } from "../../../generate/generate_random_ecommerce_mall_admin_admin_sellers_suspend";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

/**
 * Test retrieving a specific seller suspension record by its UUID.
 *
 * Validates the complete suspension audit trail retrieval flow including
 * administrative authentication, seller registration approval, and suspension
 * creation. Verifies that the suspension record contains all required fields
 * including suspension ID, reason, timestamps, and properly populated embedded
 * relationships for both the suspended seller and the suspending administrator.
 *
 * 1. Admin authenticates via admin join.
 * 2. New seller registers via seller join.
 * 3. Admin approves the seller registration.
 * 4. Admin suspends the approved seller with a reason.
 * 5. Retrieve the suspension record by its UUID.
 * 6. Validate all suspension details match expected values.
 */
export async function test_api_seller_suspension_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: seller.id },
    );
  typia.assert(approvedSeller);
  // 4. Admin suspends the seller
  const suspensionReason = RandomGenerator.paragraph({ sentences: 2 });
  const suspension =
    await api.functional.ecommerceMall.admin.admin.sellers.suspend(
      adminConnection,
      {
        sellerId: approvedSeller.id,
        body: {
          reason: suspensionReason,
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension);
  // 5. Retrieve the suspension record by its UUID
  const retrievedSuspension =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.at(
      adminConnection,
      { suspensionId: suspension.id },
    );
  typia.assert(retrievedSuspension);
  // 6. Validate suspension details
  TestValidator.equals(
    "suspension ID matches",
    retrievedSuspension.id,
    suspension.id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedSuspension.reason,
    suspensionReason,
  );
  TestValidator.equals(
    "suspended_at matches",
    retrievedSuspension.suspended_at,
    suspension.suspendedAt,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedSuspension.created_at,
    suspension.createdAt,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedSuspension.updated_at,
    suspension.updatedAt,
  );
  // Validate seller embedded relationship
  TestValidator.equals(
    "seller ID matches",
    retrievedSuspension.seller.id,
    approvedSeller.id,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedSuspension.seller.email,
    approvedSeller.email,
  );
  TestValidator.equals(
    "seller approval status is approved",
    retrievedSuspension.seller.approvalStatus,
    "approved",
  );
  TestValidator.equals(
    "seller suspension status is suspended",
    retrievedSuspension.seller.suspensionStatus,
    "suspended",
  );
  // Validate suspendedBy admin embedded relationship
  TestValidator.equals(
    "suspendedBy admin ID matches",
    retrievedSuspension.suspendedBy.id,
    admin.id,
  );
  TestValidator.equals(
    "suspendedBy admin email matches",
    retrievedSuspension.suspendedBy.email,
    admin.email,
  );
  TestValidator.equals(
    "suspendedBy admin name matches",
    retrievedSuspension.suspendedBy.name,
    admin.name,
  );
  // Validate restoration fields are null for active suspension
  TestValidator.equals(
    "restored_at is null for active suspension",
    retrievedSuspension.restored_at,
    null,
  );
  TestValidator.equals(
    "restoredBy is null for active suspension",
    retrievedSuspension.restoredBy,
    null,
  );
  TestValidator.equals(
    "restored_reason is null for active suspension",
    retrievedSuspension.restored_reason,
    null,
  );
}
