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

export async function test_api_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify administrator login succeeds with valid credentials.
   *
   * This scenario validates the standard administrator authentication flow by
   * first creating a new administrator account and then logging in with the same
   * credentials. It checks that the returned authorized payload contains the
   * expected identity fields, active account state, and full authorization token
   * structure needed for subsequent administrator-authenticated requests.
   *
   * 1. Create a fresh administrator account with valid registration credentials.
   * 2. Log in using the same email and password through the administrator login utility.
   * 3. Validate the authorized response payload and ensure it reflects the same account identity.
   * 4. Confirm the account state is preserved and the response includes a complete token object.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const joined = await authorize_administrator_join(administratorConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "administrator id should match after login",
    authorized.id,
    joined.id,
  );
  TestValidator.equals(
    "administrator email should match after login",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "administrator grade should match after login",
    authorized.grade,
    joined.grade,
  );
  TestValidator.equals(
    "administrator status should be preserved after login",
    authorized.status,
    joined.status,
  );
  TestValidator.equals(
    "administrator deleted_at should remain null",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "administrator status should be a non-empty string",
    authorized.status.length > 0,
  );
  TestValidator.predicate(
    "authorization token should contain access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization token should contain refresh token",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "authorization token should contain access expiration",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "authorization token should contain refreshable deadline",
    authorized.token.refreshable_until.length > 0,
  );
}
