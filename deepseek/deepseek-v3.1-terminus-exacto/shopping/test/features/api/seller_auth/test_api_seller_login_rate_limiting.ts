import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_rate_limiting(
  connection: api.IConnection,
): Promise<void> {
  // Create seller account for testing
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  const validEmail = sellerJoinResult.email;
  const wrongPassword = "wrong_password_" + RandomGenerator.alphaNumeric(10);
  // Perform multiple failed login attempts to trigger rate limiting
  let rateLimitTriggered = false;
  // Attempt consecutive failed logins until rate limiting is triggered
  for (let attempt = 1; attempt <= 10; attempt++) {
    const attemptConnection: api.IConnection = { host: connection.host };
    try {
      await TestValidator.error(`failed login attempt ${attempt}`, async () => {
        await api.functional.ecommerce.auth.seller.login(attemptConnection, {
          body: {
            email: validEmail,
            password: wrongPassword,
          } satisfies IEcommerceSeller.ILogin,
        });
      });
    } catch (error) {
      // If we get a rate limit error, mark that rate limiting is active
      if (
        error && 
        typeof error === "object" &&
        "status" in error &&
        typeof error.status === "number" &&
        (error.status === 429 || error.status === 403)
      ) {
        rateLimitTriggered = true;
        TestValidator.predicate("rate limiting activated", true);
        break;
      }
      throw error;
    }
  }
  // If rate limiting was triggered, verify it blocks both failed and successful attempts
  if (rateLimitTriggered) {
    // Attempt failed login while rate limited
    await TestValidator.httpError(
      "failed login blocked by rate limit",
      [429, 403],
      async () => {
        const blockedConnection: api.IConnection = { host: connection.host };
        await api.functional.ecommerce.auth.seller.login(blockedConnection, {
          body: {
            email: validEmail,
            password: wrongPassword,
          } satisfies IEcommerceSeller.ILogin,
        });
      },
    );
    // Attempt successful login while rate limited
    await TestValidator.httpError(
      "successful login blocked by rate limit",
      [429, 403],
      async () => {
        const blockedConnection: api.IConnection = { host: connection.host };
        await authorize_seller_login(blockedConnection, {
          body: {
            email: validEmail,
            password: sellerPassword,
          } satisfies IEcommerceSeller.ILogin,
        });
      },
    );
  } else {
    TestValidator.predicate("rate limiting should have been triggered", false);
  }
  // Note: In a complete implementation, we would test the expiration of rate limits
  // This requires either:
  // 1. Waiting for the actual rate limit window to expire
  // 2. Using test-specific mechanisms to reset rate limits
  // 3. Configuring a very short rate limit window for testing
  // For this test, we focus on verifying the rate limiting behavior was triggered
  TestValidator.predicate("rate limiting behavior tested", rateLimitTriggered);
}
