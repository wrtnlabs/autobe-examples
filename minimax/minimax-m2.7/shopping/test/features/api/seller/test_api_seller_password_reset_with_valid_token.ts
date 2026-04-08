import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_password_reset_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account and capture email for login verification
  const originalPassword = RandomGenerator.alphaNumeric(12);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: originalPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Generate a valid reset token (UUID format as per database schema)
  const resetToken = typia.random<string & tags.Format<"uuid">>();
  // 3. Call password reset endpoint with new password
  const newPassword = RandomGenerator.alphaNumeric(16);
  const response =
    await api.functional.ecommerceMall.seller.seller.password_resets.invert(
      connection,
      {
        body: {
          newPassword: newPassword,
          token: resetToken,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate response structure
  TestValidator.equals("confirmed should be true", response.confirmed, true);
  TestValidator.predicate(
    "message should indicate success",
    response.message.length > 0,
  );
  TestValidator.equals(
    "reset should contain id",
    response.reset!.id.length > 0,
    true,
  );
  TestValidator.equals(
    "reset should contain usedAt",
    response.reset!.usedAt.length > 0,
    true,
  );
  // 5. Verify token was consumed (reset object with usedAt timestamp present)
  TestValidator.predicate(
    "reset record exists with usedAt",
    response.reset !== undefined,
  );
  // 6. Verify password was actually changed by attempting login with new password
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(loginConnection, {
    body: {
      email: sellerEmail,
      password: newPassword,
    },
  });
  TestValidator.predicate(
    "login with new password succeeds",
    loginConnection.headers !== undefined,
  );
}
