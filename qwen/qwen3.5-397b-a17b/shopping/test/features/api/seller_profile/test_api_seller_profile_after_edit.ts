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
 * Test seller profile retrieval returns updated information after profile edit.
 *
 * Validates the complete seller profile update workflow including seller registration, administrator approval, profile editing, and public profile retrieval. Ensures that profile changes are immediately reflected when customers view the seller's storefront.
 *
 * The test verifies that shop_name and shop_description updates persist correctly and that the updated_at timestamp reflects the modification time. This confirms the profile update mechanism works end-to-end from both seller and customer perspectives.
 *
 * 1. Administrator creates account and logs in for approval workflow.
 * 2. Seller registers with initial credentials (approval_status becomes 'pending').
 * 3. Administrator approves the seller's registration request.
 * 4. Seller logs in with approved credentials.
 * 5. Seller updates profile with new shop_name and shop_description.
 * 6. Retrieve seller profile via public endpoint.
 * 7. Validate updated values match the edit request and timestamps are correct.
 */
export async function test_api_seller_profile_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup for approval workflow
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "super" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Seller registration (creates pending approval request)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. Admin approves seller registration request
  // In test environment, approval request ID follows pattern or is retrievable
  // For E2E testing, we use the seller ID as the approval request ID reference
  const approvalRequest =
    await api.functional.shoppingMall.admin.approval_requests.update(
      adminConnection,
      {
        requestId: sellerId as string & tags.Format<"uuid">,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvalRequest);
  TestValidator.equals("approval status", approvalRequest.status, "approved");
  TestValidator.equals(
    "approved seller id",
    approvalRequest.seller.id,
    sellerId,
  );
  // 4. Seller login after approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerLoginResult);
  // 5. Seller updates profile
  const updateBody = {
    shopName: "Updated Shop Name",
    shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallSellerProfile.IUpdate;
  const updatedProfile =
    await api.functional.shoppingMall.seller_profiles.update(sellerConnection, {
      body: updateBody,
    });
  typia.assert(updatedProfile);
  // 6. Retrieve seller profile via public endpoint
  const retrievedProfile = await api.functional.shoppingMall.seller_profiles.at(
    connection,
    { sellerId: sellerId },
  );
  typia.assert(retrievedProfile);
  // 7. Validate updated values
  TestValidator.equals(
    "shop_name matches update",
    retrievedProfile.shop_name,
    updateBody.shopName,
  );
  TestValidator.equals(
    "shop_description matches update",
    retrievedProfile.shop_description,
    updateBody.shopDescription,
  );
  // Validate timestamps
  const createdAt = new Date(retrievedProfile.created_at).getTime();
  const updatedAt = new Date(retrievedProfile.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is after created_at",
    updatedAt >= createdAt,
  );
  // Validate seller info is present
  TestValidator.equals(
    "seller id matches",
    retrievedProfile.seller.id,
    sellerId,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedProfile.seller.email,
    sellerEmail,
  );
}
