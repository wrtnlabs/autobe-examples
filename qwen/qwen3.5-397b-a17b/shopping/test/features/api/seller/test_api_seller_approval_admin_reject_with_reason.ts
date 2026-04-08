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
 * Test the seller rejection workflow where an administrator rejects a seller registration request with a rejection reason.
 *
 * Validates the complete seller rejection flow including administrator authentication, seller registration with pending status, administrator rejection with reason, and verification that rejected sellers cannot access seller features.
 *
 * Special attention is given to verifying that the rejection reason is properly stored and returned, that the approval_status changes to 'rejected', and that rejected sellers cannot login to access seller features.
 *
 * 1. Administrator creates account and authenticates.
 * 2. Seller registers with pending approval status.
 * 3. Administrator rejects seller application with rejection reason.
 * 4. Validates rejection response contains correct status and reason.
 * 5. Verifies rejected seller cannot login.
 * 6. Verifies new seller can register after rejection.
 */
export async function test_api_seller_approval_admin_reject_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Seller registration - creates seller with 'pending' status
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  // Verify seller starts with 'pending' status
  TestValidator.equals(
    "initial approval status",
    sellerJoinResult.approval_status,
    "pending",
  );
  TestValidator.equals(
    "seller email matches",
    sellerJoinResult.email,
    sellerEmail,
  );
  // 3. Administrator rejects seller with rejection reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const updatedSeller = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId: sellerJoinResult.id,
      body: {
        approval_status: "rejected",
        rejection_reason: rejectionReason,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller);
  // 4. Validate rejection response
  TestValidator.equals(
    "approval status changed to rejected",
    updatedSeller.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason populated",
    updatedSeller.rejection_reason,
    rejectionReason,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedSeller.updated_at,
    updatedSeller.created_at,
  );
  TestValidator.equals(
    "seller id unchanged",
    updatedSeller.id,
    sellerJoinResult.id,
  );
  TestValidator.equals(
    "seller email unchanged",
    updatedSeller.email,
    sellerEmail,
  );
  // 5. Verify rejected seller cannot login
  await TestValidator.error("rejected seller cannot login", async () => {
    const rejectedSellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_login(rejectedSellerConnection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.ILogin,
    });
  });
  // 6. Verify new seller can register after rejection (different email)
  const newSellerEmail = typia.random<string & tags.Format<"email">>();
  const newSellerResult = await authorize_seller_join(connection, {
    body: {
      email: newSellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(newSellerResult);
  TestValidator.equals(
    "new seller starts pending",
    newSellerResult.approval_status,
    "pending",
  );
  TestValidator.notEquals(
    "new seller has different email",
    newSellerResult.email,
    sellerEmail,
  );
}
