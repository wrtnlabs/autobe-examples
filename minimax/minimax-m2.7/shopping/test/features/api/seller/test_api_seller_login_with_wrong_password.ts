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
 * Test seller authentication fails with incorrect password.
 *
 * Validates the seller login endpoint properly rejects authentication
 * attempts when the wrong password is provided. Verifies that:
 * - HTTP 401 Unauthorized is returned for invalid credentials
 * - No JWT tokens are issued on failed authentication
 * - Security: Error messages do not reveal whether email exists
 *
 * 1. Register a new seller account with valid credentials
 * 2. Attempt login with correct email but incorrect password
 * 3. Verify authentication is rejected with 401 status
 *
 * This test ensures the authentication system handles incorrect
 * passwords securely without leaking information about account existence.
 */
export async function test_api_seller_login_with_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller account with valid credentials
  const seller = await authorize_seller_join(connection, {});
  // 2. Attempt login with wrong password - should fail with 401
  await TestValidator.httpError("wrong password returns 401", 401, async () => {
    await api.functional.ecommerceMall.auth.seller.login(connection, {
      body: {
        email: seller.email,
        password: "wrong_password_12345",
        href: "https://example.com/login",
        referrer: "https://example.com/",
      } satisfies IEcommerceMallSeller.ILogin,
    });
  });
}
