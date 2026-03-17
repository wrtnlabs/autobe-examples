import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
 * Test retrieving a rejected seller's shop profile as an administrator.
 *
 * This test validates the seller rejection workflow and ensures that:
 * 1. Admin can reject a pending seller registration with a reason
 * 2. Rejected seller profile shows approval_status as "REJECTED"
 * 3. rejection_reason is properly stored and retrievable
 * 4. approvedByAdmin is null for rejected sellers
 * 5. Shop information remains accessible even after rejection
 */
export async function test_api_seller_profile_retrieval_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a seller account (will be in PENDING status)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  const sellerId = sellerJoinResult.id;
  // 3. Reject the seller registration with a specific reason
  const rejectionReason =
    "Incomplete documentation provided. Please resubmit with valid business registration certificate.";
  const rejectedSeller =
    await api.functional.shoppingMall.admin.admin.sellers.reject(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          reason: rejectionReason,
        } satisfies IShoppingMallSeller.IReject,
      },
    );
  typia.assert(rejectedSeller);
  // 4. Retrieve the rejected seller's profile
  const sellerProfile = await api.functional.shoppingMall.admin.sellers.at(
    adminConnection,
    {
      sellerId: sellerId,
    },
  );
  typia.assert(sellerProfile);
  // 5. Validate the rejection was properly recorded
  TestValidator.equals(
    "approval status is REJECTED",
    sellerProfile.approval_status,
    "REJECTED",
  );
  TestValidator.equals(
    "rejection reason matches",
    sellerProfile.rejection_reason,
    rejectionReason,
  );
  TestValidator.equals(
    "approvedByAdmin is null for rejected seller",
    sellerProfile.approvedByAdmin,
    null,
  );
  TestValidator.predicate(
    "shop name is accessible",
    sellerProfile.shop_name !== undefined && sellerProfile.shop_name.length > 0,
  );
  TestValidator.predicate(
    "shop description is accessible",
    sellerProfile.shop_description !== undefined,
  );
  TestValidator.predicate(
    "logo image URL is accessible",
    sellerProfile.logo_image_url !== undefined,
  );
  TestValidator.equals("seller ID matches", sellerProfile.id, sellerId);
  TestValidator.equals(
    "seller email matches",
    sellerProfile.email,
    sellerEmail,
  );
}
