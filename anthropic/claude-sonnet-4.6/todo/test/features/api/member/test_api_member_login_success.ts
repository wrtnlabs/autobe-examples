import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joined);
  // Step 2: Login with the same credentials using a fresh connection
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(loggedIn);
  // Step 3: Validate business logic
  // email must match the registered email
  TestValidator.equals("email matches registration", loggedIn.email, email);
  // profile.memberId must match the member id
  TestValidator.equals(
    "profile memberId matches member id",
    loggedIn.profile.memberId,
    loggedIn.id,
  );
  // deleted_at must be null (active account)
  TestValidator.equals("deleted_at is null", loggedIn.deleted_at, null);
  // token fields must be non-empty
  TestValidator.predicate(
    "access token non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token non-empty",
    loggedIn.token.refresh.length > 0,
  );
  // token expiration timestamps must be in the future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "expired_at is in the future",
    loggedIn.token.expired_at > now,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    loggedIn.token.refreshable_until > now,
  );
  // refreshable_until must be later than expired_at
  TestValidator.predicate(
    "refreshable_until is later than expired_at",
    loggedIn.token.refreshable_until > loggedIn.token.expired_at,
  );
  // profile displayName must be non-empty
  TestValidator.predicate(
    "displayName is non-empty",
    loggedIn.profile.displayName.length > 0,
  );
}
