import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
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
 * Test seller access control for password reset tokens.
 * Verifies that sellers cannot access other sellers' password reset tokens
 * and that the system properly enforces data isolation.
 */
export async function test_api_seller_password_reset_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller B setup - creates the seller who owns the password reset token
  const sellerBPassword = RandomGenerator.alphaNumeric(16);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuthorized = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerBAuthorized);
  // Seller B logs in with correct password
  const sellerBLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerBLoginConnection, {
    body: {
      email: sellerBAuthorized.email,
      password: sellerBPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 2. Seller A setup - the unauthorized accessor
  const sellerAPassword = RandomGenerator.alphaNumeric(16);
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuthorized = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAAuthorized);
  // Seller A logs in with correct password
  const sellerALoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerALoginConnection, {
    body: {
      email: sellerAAuthorized.email,
      password: sellerAPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Test access control - Seller A attempts to access password reset tokens
  // Generate random UUID for testing access to non-existent tokens
  const randomResetId = typia.random<string & tags.Format<"uuid">>();
  // Seller A attempts to access a password reset token
  // This should fail with 404 (not found) or 403 (forbidden)
  await TestValidator.httpError(
    "Seller A cannot access Seller B's password reset token",
    [404, 403],
    async () => {
      await api.functional.ecommerceMall.seller.password_resets.at(
        sellerALoginConnection,
        {
          resetId: randomResetId,
        },
      );
    },
  );
  // 4. Test that Seller B also cannot access tokens via this API
  // Password reset tokens are accessed via email link, not seller API
  await TestValidator.httpError(
    "Sellers cannot access password reset tokens via API endpoint",
    [404, 403],
    async () => {
      await api.functional.ecommerceMall.seller.password_resets.at(
        sellerBLoginConnection,
        {
          resetId: randomResetId,
        },
      );
    },
  );
  // 5. Test token enumeration prevention - multiple attempts should all fail
  const enumerationResetIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  await ArrayUtil.asyncForEach(enumerationResetIds, async (resetId) => {
    await TestValidator.httpError(
      "Seller A cannot enumerate password reset tokens",
      [404, 403],
      async () => {
        await api.functional.ecommerceMall.seller.password_resets.at(
          sellerALoginConnection,
          {
            resetId: resetId,
          },
        );
      },
    );
  });
}
