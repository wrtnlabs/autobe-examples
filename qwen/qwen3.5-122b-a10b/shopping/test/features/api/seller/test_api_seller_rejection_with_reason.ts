import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
 * Test administrator rejecting a seller registration application with a reason.
 *
 * 1. Create and authenticate as administrator
 * 2. Create a seller account (created with 'pending' approval status)
 * 3. Admin rejects the seller with a rejection reason
 * 4. Verify seller's approval_status changed to 'rejected'
 * 5. Verify rejection_reason is stored
 * 6. Verify seller can still login (account_status remains 'active')
 * 7. Verify seller can view the rejection reason
 */
export async function test_api_seller_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Login as admin to get fresh connection with token
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create a seller account (will be in 'pending' status)
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinInput = {
    email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
    password: sellerPassword,
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    adminConnection,
    {
      body: sellerJoinInput,
    },
  );
  typia.assert(sellerAuth);
  // Verify seller was created with 'pending' status
  TestValidator.equals(
    "seller approval status is pending",
    sellerAuth.approval_status,
    "pending",
  );
  const sellerId = sellerAuth.id;
  // 3. Admin rejects the seller with a rejection reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedSeller =
    await api.functional.ecommerceMall.admin.sellers.reject(
      adminLoginConnection,
      {
        sellerId,
        body: {
          approval_status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IEcommerceMallSeller.IUpdate,
      },
    );
  typia.assert(rejectedSeller);
  // 4. Verify seller's approval_status changed to 'rejected'
  TestValidator.equals(
    "seller approval status is rejected",
    rejectedSeller.approval_status,
    "rejected",
  );
  // 5. Verify rejection_reason is stored
  TestValidator.equals(
    "rejection reason is stored",
    rejectedSeller.rejection_reason,
    rejectionReason,
  );
  // 6. Verify seller can still login (account_status remains 'active')
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuth = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerJoinInput.email,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLoginAuth);
  // Verify seller can login and sees rejection reason
  TestValidator.equals(
    "seller account status is active",
    sellerLoginAuth.account_status,
    "active",
  );
  TestValidator.equals(
    "seller can see rejection reason",
    sellerLoginAuth.rejection_reason,
    rejectionReason,
  );
}
