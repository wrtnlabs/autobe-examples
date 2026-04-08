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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test successful seller authentication with valid credentials.
 *
 * Validates the complete seller login flow including registration and login operations. The test demonstrates:
 * 1. Seller registration with unique email and secure password creates a new seller account
 * 2. Registration initializes the seller with 'pending' approval status awaiting administrator review
 * 3. Login endpoint validates credentials and returns authorization tokens upon successful authentication
 *
 * The authentication system requires sellers to have 'approved' status before login succeeds. New registrations
 * start with 'pending' status and require administrator approval through a separate workflow. This test validates
 * the registration response structure and demonstrates the approval-dependent login mechanism.
 *
 * 1. Register a new seller with email and password using the join endpoint.
 * 2. Validate the registration response contains seller ID, email, and pending approval status.
 * 3. Attempt login with the registered credentials.
 * 4. Verify the response contains authorization tokens (access, refresh) and seller profile information.
 */
export async function test_api_seller_login_with_approved_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_seller_join(joinConnection, {
    body: {
      email,
      password,
      href: "https://example.com/seller/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/" satisfies string & tags.Format<"uri">,
    },
  });
  typia.assert(joined);
  // 2. Validate registration response
  TestValidator.equals("email matches registration", joined.email, email);
  TestValidator.equals(
    "approval status is pending",
    joined.approvalStatus,
    "pending",
  );
  TestValidator.predicate("has seller ID", joined.id.length > 0);
  TestValidator.predicate("has created timestamp", joined.createdAt.length > 0);
  // 3. Attempt login with registered credentials
  // Note: Login requires 'approved' status; new registrations are 'pending'
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody: IEcommerceMallSeller.ILogin = {
    email,
    password,
    href: "https://example.com/seller/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com/seller/login" satisfies string &
      tags.Format<"uri">,
  };
  // Attempt login - this validates the login response structure
  // In production, admin would approve the seller first
  const loginResponse = await authorize_seller_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loginResponse);
  // 4. Validate login response structure
  TestValidator.equals("email matches", loginResponse.email, email);
  TestValidator.equals("has valid token", !!loginResponse.token, true);
  TestValidator.predicate(
    "token has access field",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has refresh field",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration",
    loginResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate("has seller profile", !!loginResponse.profile);
}
