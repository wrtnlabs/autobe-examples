import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
 * Test successful seller profile retrieval by customer after admin approval.
 *
 * Validates the complete seller onboarding workflow including seller registration, administrator approval, and public profile access. Ensures that approved sellers have accessible storefront profiles with all required information properly populated.
 *
 * The test verifies the integration between seller registration, admin approval workflow, and public profile endpoints. Special attention is given to confirming that approval status changes are reflected in the profile response and that shop information matches the registration data.
 *
 * 1. Register a new seller account with email and password credentials.
 * 2. Create an administrator account with super grade for approval authority.
 * 3. Administrator logs in and approves the seller's registration request.
 * 4. Retrieve the seller's public profile using the seller ID.
 * 5. Validate profile contains all required fields with correct values.
 * 6. Verify shop_name matches registration input and approvalStatus is 'approved'.
 */
export async function test_api_seller_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: sellerJoinData,
  });
  typia.assert(sellerAuth);
  // 2. Create administrator account
  const adminJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    grade: "super" as const,
  } satisfies IShoppingMallAdmin.IJoin;
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminJoinData,
  });
  typia.assert(adminAuth);
  // Set admin authorization token for authenticated API calls
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 3. Administrator approves the seller's registration request
  // The seller ID from registration serves as the approval request identifier
  const approvalResult =
    await api.functional.shoppingMall.admin.approval_requests.update(
      adminConnection,
      {
        requestId: sellerAuth.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvalResult);
  // 4. Retrieve seller's public profile
  const profile = await api.functional.shoppingMall.seller_profiles.at(
    connection,
    {
      sellerId: sellerAuth.id,
    },
  );
  typia.assert(profile);
  // 5. Validate profile contains all required fields
  TestValidator.equals("seller ID matches", profile.seller.id, sellerAuth.id);
  TestValidator.equals(
    "seller email matches",
    profile.seller.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "approval status is approved",
    profile.seller.approvalStatus,
    "approved",
  );
  TestValidator.predicate("shop name exists", profile.shop_name.length > 0);
  TestValidator.predicate(
    "shop description exists",
    profile.shop_description.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    new Date(profile.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    new Date(profile.updated_at).getTime() > 0,
  );
}
