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
 * Test seller authentication fails with non-existent email account.
 *
 * Validates that attempting to log in with an email address that does not
 * correspond to any registered seller account returns a 401 Unauthorized
 * response. This test ensures proper security handling where the system
 * does not reveal whether an account exists for a given email address.
 *
 * Security considerations:
 * - Both "email not found" and "wrong password" cases should return identical
 *   error messages to prevent account enumeration attacks
 * - No JWT tokens are issued for non-existent accounts
 * - No session is created for non-existent accounts
 *
 * 1. Attempt login with non-existent email address.
 * 2. Expect 401 Unauthorized HTTP error.
 * 3. No token or session data is returned.
 */
export async function test_api_seller_login_with_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // Create a new seller connection for testing
  const sellerConnection: api.IConnection = { host: connection.host };
  // Use a clearly non-existent email address
  const nonexistentEmail = `nonexistent.${Date.now()}@test-nonexistent.com`;
  // Attempt login with non-existent email - should fail with 401
  await TestValidator.httpError(
    "login with non-existent email returns 401",
    401,
    async () =>
      await api.functional.ecommerceMall.auth.seller.login(sellerConnection, {
        body: {
          email: nonexistentEmail as string & tags.Format<"email">,
          password: "anypassword123",
          href: "https://example.com/login" as string & tags.Format<"uri">,
          referrer: "https://example.com/" as string & tags.Format<"uri">,
        } satisfies IEcommerceMallSeller.ILogin,
      }),
  );
}
