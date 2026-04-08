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
 * Test that administrators cannot approve their own seller account.
 *
 * Validates the business rule preventing self-approval of seller registrations. When an administrator account shares the same email as a seller account, attempting to approve that seller must be rejected with 403 Forbidden. This ensures proper separation of duties and prevents administrators from bypassing the approval process for their own seller accounts.
 *
 * The test creates two accounts with identical email addresses: a seller account and an administrator account. By attempting to approve the seller through the admin account, we verify that the system correctly identifies and blocks self-approval attempts.
 *
 * 1. Register a seller with unique email and password.
 * 2. Register an administrator with the SAME email as the seller.
 * 3. Authenticate as seller to obtain seller ID.
 * 4. Authenticate as administrator.
 * 5. Attempt to approve seller through admin endpoint.
 * 6. Validate 403 Forbidden response with appropriate error message.
 * 7. Verify seller's approval_status remains 'pending'.
 */
export async function test_api_seller_approval_self_approval_prevented(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account with unique email
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Register administrator with SAME email as seller
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: sellerEmail, // Same email as seller
      password: adminPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Re-authenticate as seller to get current seller state (with ID)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuth = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerLoginAuth);
  const sellerId = sellerLoginAuth.id;
  // 4. Authenticate as administrator
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: sellerEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Attempt to approve own seller account - should fail with 403
  await TestValidator.httpError(
    "admin cannot approve own seller account",
    403,
    async () =>
      await api.functional.ecommerceMall.admin.admin.sellers.approve(
        adminLoginConnection,
        { sellerId },
      ),
  );
  // 6. Verify seller.approval_status remains 'pending'
  // Re-authenticate as seller to verify status
  const verifyConnection: api.IConnection = { host: connection.host };
  const verifyAuth = await authorize_seller_login(verifyConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(verifyAuth);
  TestValidator.equals(
    "seller approval_status remains pending",
    verifyAuth.approvalStatus,
    "pending",
  );
}
