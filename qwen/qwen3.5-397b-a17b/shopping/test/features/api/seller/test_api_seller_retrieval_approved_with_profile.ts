import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieving a specific seller account that has been approved with complete profile information.
 *
 * Validates the complete seller retrieval workflow including administrator authentication, seller account lookup, and profile data verification. Ensures that the response includes all required seller information with embedded profile details for approved sellers.
 *
 * Special attention is given to verifying that the approval_status is 'approved', rejection_reason is null, and the profile object contains shop_name, shop_description, and logo_image_url fields as expected for approved sellers.
 *
 * 1. Administrator creates account and authenticates using authorize_admin_join utility.
 * 2. Administrator retrieves seller details by sellerId using the sellers.at endpoint.
 * 3. Validates seller information includes id, email, approval_status, and timestamps.
 * 4. Verifies profile object exists with shop_name, shop_description, and logo_image_url.
 * 5. Confirms profile.seller reference contains proper seller summary information.
 */
export async function test_api_seller_retrieval_approved_with_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator Authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve Seller Details
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const seller = await api.functional.shoppingMall.admin.admin.sellers.at(
    adminConnection,
    {
      sellerId: sellerId,
    },
  );
  typia.assert(seller);
  // 3. Validate Seller Business Logic
  TestValidator.equals("seller id matches", seller.id, sellerId);
  TestValidator.equals("approval status", seller.approval_status, "approved");
  TestValidator.equals(
    "rejection reason is null",
    seller.rejection_reason,
    null,
  );
  // 4. Validate Profile Exists and Contains Required Fields
  typia.assertGuard(seller.profile!);
  const profile = seller.profile;
  TestValidator.predicate("shop name exists", profile.shop_name.length > 0);
  TestValidator.predicate(
    "shop description exists",
    profile.shop_description.length > 0,
  );
  // 5. Validate Profile Seller Reference
  TestValidator.equals(
    "profile seller id matches",
    profile.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "profile seller email matches",
    profile.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "profile seller approval status",
    profile.seller.approvalStatus,
    "approved",
  );
}
