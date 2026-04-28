import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
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
 * Test administrator retrieval of seller approval request with seller profile information.
 *
 * Validates the seller approval request retrieval flow including seller registration, automatic pending approval creation, and administrative retrieval capability. Ensures that the returned approval request properly includes the seller's summary data with associated business profile information.
 *
 * Special attention is given to verifying that the seller summary within the approval request contains the seller profile relation populated with shop identity fields including shop name, shop description, and logo image URI.
 *
 * 1. Administrator registers to access seller approval review capabilities.
 * 2. Seller registers their account, automatically creating a pending approval request.
 * 3. Administrator retrieves the approval request by its unique identifier.
 * 4. Validates that the response includes seller summary with associated profile data.
 */
export async function test_api_seller_approval_retrieve_with_seller_profile(
  connection: api.IConnection,
) {
  // 1. Admin authentication for approval review
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration (creates pending approval request automatically)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  // 3. Retrieve approval request by ID
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const approvalRequest =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.at(
      adminConnection,
      {
        requestId,
      },
    );
  typia.assert(approvalRequest);
  // 4. Validate approval request structure and seller association
  TestValidator.predicate(
    "approval request has valid status",
    () =>
      approvalRequest.status === "pending" ||
      approvalRequest.status === "approved" ||
      approvalRequest.status === "rejected",
  );
  TestValidator.equals(
    "seller profile has shop name",
    approvalRequest.seller.sellerProfile.shop_name !== "",
    true,
  );
  TestValidator.equals(
    "seller profile has shop description",
    approvalRequest.seller.sellerProfile.shop_description !== "",
    true,
  );
  TestValidator.equals(
    "seller profile has logo image URI",
    approvalRequest.seller.sellerProfile.logo_image_uri !== "",
    true,
  );
}
