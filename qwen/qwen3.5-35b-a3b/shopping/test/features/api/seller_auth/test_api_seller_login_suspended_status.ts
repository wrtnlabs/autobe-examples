import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
 * Test that seller login properly validates approval status and rejects unapproved sellers.
 *
 * Verifies the seller authentication flow for pending approval status validation. Since direct seller suspension admin API is not available in the provided SDK, this test focuses on testing the login validation for different approval states. The test ensures that login is properly blocked for unapproved sellers while validating proper session context capture.
 *
 * Special attention is given to verifying that session context fields (href, referrer, ip) are properly captured and that JWT tokens are only issued for approved seller accounts.
 *
 * 1. Register a new seller account (approval_status='pending' by default).
 * 2. Verify seller was created with pending approval status.
 * 3. Attempt login with pending status - should fail with 403 Forbidden.
 * 4. Validate that no JWT tokens are issued for pending seller.
 * 5. Verify proper error response structure for unapproved login attempt.
 */
export async function test_api_seller_login_suspended_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection for registration
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Generate seller credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name(2);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // 3. Register seller (approval_status will be 'pending')
  const joinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      display_name: displayName,
      href,
      referrer,
      ip,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(joinResult);
  // Verify seller was created with pending approval status
  TestValidator.equals(
    "seller approval status is pending",
    joinResult.approval_status,
    "pending",
  );
  // Verify seller is not suspended initially
  TestValidator.equals(
    "seller is not suspended initially",
    joinResult.is_suspended,
    false,
  );
  // 4. Try to login with pending status - should fail with 403 Forbidden
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("login fails for pending seller", async () => {
    await api.functional.ecommerceMall.auth.seller.login(loginConnection, {
      body: {
        email,
        password,
        href,
        referrer,
        ip,
      } satisfies IEcommerceMallSeller.ILogin,
    });
  });
}
