import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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
 * Test that an administrator can view a rejected seller's account details including the rejection_reason field.
 *
 * Validates the complete seller rejection workflow including administrator authentication, seller account creation, approval status update to rejected with rejection reason, and verification that the rejection reason is visible when retrieving seller details.
 *
 * Special attention is given to verifying that the rejection_reason field is populated only when approval_status is 'rejected', and that all required seller account fields are present in the response.
 *
 * 1. Administrator joins and authenticates via admin join operation.
 * 2. Seller account is created via seller join operation with approval_status 'pending'.
 * 3. Administrator updates seller approval status to 'rejected' with a rejection reason message.
 * 4. Administrator retrieves the rejected seller's account details via GET endpoint.
 * 5. Validates approval_status is 'rejected' and rejection_reason contains the administrator's feedback.
 * 6. Confirms all required fields are present: id, email, created_at, updated_at, deleted_at.
 */
export async function test_api_seller_account_rejection_reason_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await authorize_seller_join(
    { host: connection.host },
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(sellerJoinResult);
  const sellerId = sellerJoinResult.id;
  // 3. Update seller to rejected status with rejection reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const updatedSeller = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId: sellerId,
      body: {
        approval_status: "rejected",
        rejection_reason: rejectionReason,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller);
  // 4. Retrieve rejected seller details
  const retrievedSeller = await api.functional.shoppingMall.admin.sellers.at(
    adminConnection,
    {
      sellerId: sellerId,
    },
  );
  typia.assert(retrievedSeller);
  // 5. Validate approval status and rejection reason
  TestValidator.equals(
    "approval status is rejected",
    retrievedSeller.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    retrievedSeller.rejection_reason,
    rejectionReason,
  );
  // 6. Validate email matches original
  TestValidator.equals("email matches", retrievedSeller.email, sellerEmail);
}
