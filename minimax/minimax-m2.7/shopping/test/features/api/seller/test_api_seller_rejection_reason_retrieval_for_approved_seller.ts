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
 * Test rejection reason retrieval for an approved seller.
 *
 * Validates the GET /ecommerceMall/seller/seller/rejection-reason endpoint when the seller
 * has been approved by an administrator. This test ensures that approved sellers receive
 * null values for both rejectionReason and rejectedAt fields, confirming they have successfully
 * passed the registration review process.
 *
 * Flow:
 * 1. Register a new seller account with pending approval status.
 * 2. Create an administrator account.
 * 3. Authenticate as the admin and approve the seller.
 * 4. Login as the approved seller.
 * 5. Call the rejection-reason endpoint and validate null responses.
 *
 * This test validates the business logic that only rejected sellers have rejection details;
 * approved sellers should have null values indicating no rejection occurred.
 */
export async function test_api_seller_rejection_reason_retrieval_for_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  const sellerId = sellerAuth.id;
  typia.assert(sellerAuth);
  // 2. Create an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId },
    );
  typia.assert(approvedSeller);
  // 4. Login as the approved seller to get fresh authorization
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerAuth.email,
      password: "1234",
      href: "https://example.com/seller/login",
      referrer: "https://example.com/seller/register",
    },
  });
  // 5. Call the rejection-reason endpoint
  const rejectionReason =
    await api.functional.ecommerceMall.seller.seller.rejection_reason.rejectionReason(
      approvedSellerConnection,
    );
  typia.assert(rejectionReason);
  // 6. Validate that approved seller has null rejection details
  TestValidator.equals(
    "rejectionReason should be null for approved seller",
    rejectionReason.rejectionReason,
    null,
  );
  TestValidator.equals(
    "rejectedAt should be null for approved seller",
    rejectionReason.rejectedAt,
    null,
  );
}
