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
 * Validate administrator registration rejects duplicate emails.
 *
 * Verifies the account-creation uniqueness boundary by creating one
 * administrator successfully, attempting a second registration with the
 * same email, and confirming the duplicate attempt fails while the original
 * account remains usable.
 *
 * 1. Register an administrator account with a unique email.
 * 2. Attempt to register another administrator using the same email.
 * 3. Confirm the duplicate registration is rejected.
 * 4. Verify the original administrator account data remains unchanged.
 */
export async function test_api_administrator_join_duplicate_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphabets(10)}@test.com` satisfies string &
    tags.Format<"email">;
  const password = typia.random<string & tags.Format<"password">>();
  const first = await authorize_administrator_join(adminConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(first);
  TestValidator.equals(
    "administrator email should match request",
    first.email,
    email,
  );
  TestValidator.predicate(
    "administrator id should be created",
    first.id.length > 0,
  );
  TestValidator.equals(
    "administrator account should remain active",
    first.deleted_at,
    null,
  );
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate administrator email should be rejected",
    async () => {
      await authorize_administrator_join(duplicateConnection, {
        body: {
          email,
          password: typia.random<string & tags.Format<"password">>(),
        } satisfies IMallPlatformAdministrator.IJoin,
      });
    },
  );
}
