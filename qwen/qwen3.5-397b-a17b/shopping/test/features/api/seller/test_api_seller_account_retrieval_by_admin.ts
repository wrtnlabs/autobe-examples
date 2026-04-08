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
 * Test administrator retrieval of seller account details with pending approval status.
 *
 * Validates the complete workflow where an administrator retrieves detailed information for a seller account that has just registered and is awaiting approval. The test ensures that administrators can access seller account information including approval status, email, and account lifecycle timestamps.
 *
 * Special attention is given to verifying that newly registered sellers have 'pending' approval_status and null rejection_reason, confirming the approval workflow is functioning correctly. The test also validates that all timestamp fields are properly formatted ISO 8601 strings.
 *
 * 1. Administrator account is created via admin join operation.
 * 2. Seller account is created via seller join operation, automatically setting approval_status to 'pending'.
 * 3. Administrator calls GET /shoppingMall/admin/sellers/{sellerId} endpoint with the seller's UUID.
 * 4. Validates response contains all required fields: id, email, approval_status, created_at, updated_at, deleted_at.
 * 5. Confirms approval_status is 'pending' and rejection_reason is null for new seller registrations.
 * 6. Validates timestamps are properly formatted ISO 8601 date-time strings.
 */
export async function test_api_seller_account_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create seller account (will have pending approval status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  // 3. Administrator retrieves seller account details
  const seller = await api.functional.shoppingMall.admin.sellers.at(
    adminConnection,
    {
      sellerId: sellerJoinResult.id,
    },
  );
  typia.assert(seller);
  // 4. Validate response contains all required fields
  TestValidator.equals("seller id matches", seller.id, sellerJoinResult.id);
  TestValidator.equals("email matches", seller.email, sellerJoinResult.email);
  TestValidator.equals(
    "approval status is pending",
    seller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "rejection reason is null",
    seller.rejection_reason,
    null,
  );
  TestValidator.equals("deleted_at is null", seller.deleted_at, null);
  // 5. Validate timestamps are reasonable (typia.assert already validates ISO 8601 format)
  const createdAt = new Date(seller.created_at).getTime();
  const updatedAt = new Date(seller.updated_at).getTime();
  const now = Date.now();
  const oneMinute = 60 * 1000;
  TestValidator.predicate("created_at is recent", () => {
    return now - createdAt < oneMinute;
  });
  TestValidator.predicate("updated_at is recent", () => {
    return now - updatedAt < oneMinute;
  });
  TestValidator.predicate("updated_at >= created_at", () => {
    return updatedAt >= createdAt;
  });
}
