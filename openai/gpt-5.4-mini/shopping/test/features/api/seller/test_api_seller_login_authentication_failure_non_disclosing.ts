import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verifies seller login failures do not disclose whether the email or password was incorrect.
 *
 * This test first creates a baseline seller account to establish a valid seller identity for the scenario. It then attempts to authenticate with a mismatched password for that existing account and with a different, non-existent email using the same password shape.
 *
 * The goal is to confirm that the seller authentication endpoint rejects invalid sign-in attempts in a generic way and does not leak account existence details through the response contract.
 *
 * 1. Register a baseline seller account.
 * 2. Attempt login with the registered email and an incorrect password.
 * 3. Attempt login with a guaranteed different email and the original password.
 * 4. Validate that both attempts are rejected.
 */
export async function test_api_seller_login_authentication_failure_non_disclosing(
  connection: api.IConnection,
): Promise<void> {
  const signupConnection: api.IConnection = { host: connection.host };
  const baselineEmail = typia.random<string & tags.Format<"email">>();
  const baselinePassword = "Password1234!" satisfies string;
  const registered = await authorize_seller_join(signupConnection, {
    body: {
      email: baselineEmail,
      password: baselinePassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(registered);
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "seller login with wrong password should be rejected",
    [400, 401, 403],
    async () => {
      await api.functional.mallPlatform.auth.seller.login(
        wrongPasswordConnection,
        {
          body: {
            email: baselineEmail,
            password: "WrongPassword1234!",
          } satisfies IMallPlatformSeller.ILogin,
        },
      );
    },
  );
  const unknownEmailConnection: api.IConnection = { host: connection.host };
  const unknownEmail = `${typia.random<string & tags.Format<"email">>()}.invalid`;
  await TestValidator.httpError(
    "seller login with unknown email should be rejected",
    [400, 401, 403],
    async () => {
      await api.functional.mallPlatform.auth.seller.login(
        unknownEmailConnection,
        {
          body: {
            email: unknownEmail as string & tags.Format<"email">,
            password: baselinePassword,
          } satisfies IMallPlatformSeller.ILogin,
        },
      );
    },
  );
}
