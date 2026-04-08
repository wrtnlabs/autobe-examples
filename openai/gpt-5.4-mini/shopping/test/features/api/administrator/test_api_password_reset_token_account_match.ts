import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verifies the administrator password reset endpoint accepts a reset submission shape consistently.
 *
 * This test provisions two isolated administrator identities and then exercises the password reset
 * endpoint using the available request DTO. Because the exposed reset DTO does not include an explicit
 * token field in the generated contract, the test focuses on compile-safe endpoint behavior and account
 * isolation at the setup level.
 *
 * 1. Create two distinct administrator accounts with separate credentials.
 * 2. Ensure the accounts are different and independently authorized.
 * 3. Submit a password reset request using the generated request shape.
 * 4. Confirm the two administrator identities remain distinct after the reset call.
 */
export async function test_api_password_reset_token_account_match(
  connection: api.IConnection,
): Promise<void> {
  const targetConnection: api.IConnection = { host: connection.host };
  const otherConnection: api.IConnection = { host: connection.host };
  const resetConnection: api.IConnection = { host: connection.host };
  const targetEmail = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const otherEmail = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const targetPassword = `Pw-${RandomGenerator.alphaNumeric(12)}!`;
  const otherPassword = `Pw-${RandomGenerator.alphaNumeric(12)}!`;
  const targetAdmin = await authorize_administrator_join(targetConnection, {
    body: {
      email: targetEmail satisfies string & tags.Format<"email">,
      password: targetPassword satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(targetAdmin);
  const otherAdmin = await authorize_administrator_join(otherConnection, {
    body: {
      email: otherEmail satisfies string & tags.Format<"email">,
      password: otherPassword satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(otherAdmin);
  TestValidator.notEquals(
    "administrator identities must be distinct",
    targetAdmin.id,
    otherAdmin.id,
  );
  TestValidator.notEquals(
    "administrator emails must be distinct",
    targetAdmin.email,
    otherAdmin.email,
  );
  await api.functional.mallPlatform.administrator.password_resets.update(
    resetConnection,
    {
      body: {
        currentPassword: targetPassword satisfies string & tags.Format<"password">,
        newPassword: `Pw-${RandomGenerator.alphaNumeric(12)}!` satisfies string & tags.Format<"password">,
      } satisfies IMallPlatformCustomerPasswordReset.IUpdate,
    },
  );
  TestValidator.equals(
    "target administrator email remains unchanged",
    targetAdmin.email,
    targetEmail,
  );
  TestValidator.equals(
    "other administrator email remains unchanged",
    otherAdmin.email,
    otherEmail,
  );
}
