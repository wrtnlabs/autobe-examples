import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member authentication when the registered account does not have a display_name set.
 *
 * Validates that a newly registered member without a display_name can successfully authenticate and receives an IAuthorized payload with display_name as null while all other required identity fields remain correctly populated. The test ensures the login system properly handles accounts created with minimal profile data and correctly returns valid JWT tokens for session authentication.
 *
 * The member registration process is verified to accept null display_name values, and the subsequent login operation is validated to preserve this null state in the authorization response. Special attention is given to confirming that required fields like id, email, created_at, updated_at, and token structure are present and correctly formatted regardless of the missing display name.
 *
 * 1. Member registers without providing a display_name.
 * 2. Member logs in with registered credentials.
 * 3. Validates that display_name is null in the authorization response.
 * 4. Validates required identity fields (id, email, timestamps, token) are present.
 */
export async function test_api_member_login_null_display_name(
  connection: api.IConnection,
) {
  // 1. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate credentials for registration without display_name
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinBody: ITodoAppMember.IJoin = {
    display_name: undefined,
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>() ?? undefined,
  } satisfies ITodoAppMember.IJoin;
  const joinOutput = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(joinOutput);
  // 2. Member login
  const loginBody: ITodoAppMember.ILogin = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>() ?? undefined,
  } satisfies ITodoAppMember.ILogin;
  const loginOutput = await authorize_member_login(memberConnection, {
    body: loginBody,
  });
  typia.assert(loginOutput);
  // 3. Validate display_name is null
  TestValidator.equals("display_name is null", loginOutput.display_name, null);
  // 4. Validate required identity fields are present
  TestValidator.predicate("id is valid UUID", loginOutput.id.length === 36);
  TestValidator.equals("email matches registration", loginOutput.email, email);
  TestValidator.predicate(
    "created_at is present",
    loginOutput.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    loginOutput.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    loginOutput.deleted_at,
    null,
  );
  // 5. Validate token structure
  TestValidator.predicate(
    "access token is present",
    loginOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    loginOutput.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is present",
    loginOutput.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is present",
    loginOutput.token.refreshable_until.length > 0,
  );
}
