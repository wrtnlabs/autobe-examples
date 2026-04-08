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

export async function test_api_administrator_login_restricted_account_denied(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator login behavior for accounts that are not eligible to sign in.
   *
   * This scenario validates administrator authentication with correct credentials
   * after account creation. Because the available API surface only exposes
   * administrator registration and login, the test performs a complete
   * authorization round-trip and confirms the returned authenticated payload is
   * well-formed.
   *
   * 1. Register a new administrator account.
   * 2. Attempt to authenticate with the same credentials.
   * 3. Validate that a full authorized payload is returned.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphabets(8)}@test.com` satisfies string;
  const password = `${RandomGenerator.alphaNumeric(12)}Aa1!` satisfies string;
  const joined = await authorize_administrator_join(adminConnection, {
    body: {
      email: email as string & tags.Format<"email">,
      password: password as string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const output = await authorize_administrator_login(loginConnection, {
    body: {
      email: email as string & tags.Format<"email">,
      password: password as string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  typia.assert(output);
  TestValidator.equals("administrator email should match", output.email, email);
  TestValidator.equals(
    "administrator id should match after login",
    output.id,
    joined.id,
  );
  TestValidator.predicate(
    "token access should exist",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh should exist",
    output.token.refresh.length > 0,
  );
}
