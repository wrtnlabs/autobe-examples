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
 * Test seller password change fails when current password is incorrect.
 *
 * Validates that when a seller attempts to change their password with an incorrect
 * current password, the system properly rejects the request with a 401 Unauthorized
 * error. The test ensures that:
 * - Password verification fails when wrong current password is provided
 * - The stored password hash remains unchanged after the failed attempt
 * - Original credentials continue to work for authentication
 *
 * This test is critical for security, ensuring that password change requires
 * proper identity verification through the current password.
 *
 * 1. Register a new seller account with join endpoint
 * 2. Authenticate seller to obtain JWT tokens via login
 * 3. Attempt password change with wrong current password
 * 4. Verify 401 Unauthorized error response
 * 5. Verify original password still works for login
 */
export async function test_api_seller_password_change_wrong_current_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.ecommerceMall.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: originalPassword satisfies string &
        tags.Format<"password"> &
        tags.MinLength<8>,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Authenticate seller to obtain JWT tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.seller.login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: originalPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Attempt password change with wrong current password
  await TestValidator.error(
    "password change fails with wrong current password",
    async () => {
      await api.functional.ecommerceMall.seller.seller.password.update(
        sellerConnection,
        {
          body: {
            currentPassword: "wrongpassword123" satisfies string &
              tags.Format<"password"> &
              tags.MinLength<8>,
            newPassword: RandomGenerator.alphaNumeric(12) satisfies string &
              tags.Format<"password"> &
              tags.MinLength<8>,
          } satisfies IEcommerceMallSeller.IPasswordChange,
        },
      );
    },
  );
  // 4. Verify original password still works (login should succeed)
  const verifyConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.ecommerceMall.auth.seller.login(
    verifyConnection,
    {
      body: {
        email: sellerEmail,
        password: originalPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(authorized);
}
