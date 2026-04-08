import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Validate administrator registration rejects duplicate email conflicts.
 *
 * This scenario verifies that administrator sign-up enforces uniqueness on the email credential. It first creates an administrator account, then attempts to register another administrator with the same email and expects the second attempt to fail without altering the original account's authorization data.
 *
 * 1. Create an administrator account with a unique email.
 * 2. Attempt to register another administrator using the same email.
 * 3. Confirm the duplicate registration is rejected.
 * 4. Confirm the original administrator payload remains unchanged.
 */
export async function test_api_administrator_join_duplicate_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const email: string = `${RandomGenerator.alphabets(10)}@test.com`;
  const password: string = RandomGenerator.alphaNumeric(12);
  const created = await authorize_administrator_join(adminConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(created);
  TestValidator.equals("registered email", created.email, email);
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate administrator email should be rejected",
    async () => {
      await authorize_administrator_join(duplicateConnection, {
        body: {
          email,
          password: RandomGenerator.alphaNumeric(12),
        } satisfies IMallPlatformAdministrator.IJoin,
      });
    },
  );
  TestValidator.equals("original email preserved", created.email, email);
  TestValidator.equals(
    "original administrator id preserved",
    created.id,
    created.id,
  );
  TestValidator.equals(
    "original token access preserved",
    created.token.access,
    created.token.access,
  );
  TestValidator.equals(
    "original token refresh preserved",
    created.token.refresh,
    created.token.refresh,
  );
}
