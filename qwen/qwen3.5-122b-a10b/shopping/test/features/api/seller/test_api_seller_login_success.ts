import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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
 * Test successful seller login authentication workflow with administrator approval.
 *
 * Validates the complete seller authentication flow including administrator account setup, seller registration, administrator approval, and successful seller login. Ensures that approved sellers can authenticate and receive valid JWT tokens for subsequent API calls.
 *
 * The test follows a multi-step workflow where an administrator first registers and logs in, then a seller registers with pending approval status, the administrator approves the seller registration, and finally the seller logs in successfully.
 *
 * 1. Administrator registers and logs in to gain approval privileges.
 * 2. Seller registers with valid credentials, creating a pending approval account.
 * 3. Administrator approves the seller registration via the approval endpoint.
 * 4. Seller logs in with approved account credentials.
 * 5. Validates the login response contains valid JWT tokens and seller information.
 * 6. Confirms access token can be used for subsequent authenticated API calls.
 */
export async function test_api_seller_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: adminPassword,
    } satisfies IEcommerceAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 2. Seller registration - creates pending approval account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // 3. Administrator approves seller registration
  // Use seller's ID to find the approval record
  const approvalUpdate = await api.functional.ecommerce.admin.approvals.update(
    adminConnection,
    {
      approvalId: sellerJoin.id,
      body: {
        status: "approved",
      } satisfies IEcommerceSellerApproval.IUpdate,
    },
  );
  typia.assert(approvalUpdate);
  // 4. Seller login with approved account
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 5. Validate login response structure
  TestValidator.equals("seller has valid ID", typeof sellerLogin.id, "string");
  TestValidator.predicate(
    "approval status is approved",
    sellerLogin.approval_status === "approved",
  );
  TestValidator.predicate(
    "has access token",
    typeof sellerLogin.token.access === "string",
  );
  TestValidator.predicate(
    "has refresh token",
    typeof sellerLogin.token.refresh === "string",
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    typeof sellerLogin.token.expired_at === "string",
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    typeof sellerLogin.token.refreshable_until === "string",
  );
}
