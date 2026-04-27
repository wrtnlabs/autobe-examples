import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // 1. Prepare credentials for the new member
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1);
  const password = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  // 2. Register a new member using the authorize_member_join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email,
      username,
      password,
    },
  });
  typia.assert(joined);
  // 3. Verify registration response fields
  TestValidator.equals("registered email", joined.email, email);
  TestValidator.equals("registered username", joined.username, username);
  // 4. Prepare login body with the same credentials
  const loginBody: ICommunityPlatformMember.ILogin = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  // 5. Login with the same credentials using a fresh connection
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_member_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loggedIn);
  // 6. Validate identity fields match the registered member
  TestValidator.equals("login id matches registration", loggedIn.id, joined.id);
  TestValidator.equals("login email matches input", loggedIn.email, email);
  TestValidator.equals(
    "login username matches input",
    loggedIn.username,
    username,
  );
  // 7. Validate profile structure - business logic for fresh account
  TestValidator.predicate(
    "biography is null for fresh account",
    loggedIn.profile.biography === null,
  );
  TestValidator.predicate(
    "avatar_uri is null for fresh account",
    loggedIn.profile.avatar_uri === null,
  );
  TestValidator.equals(
    "karma is 0 for fresh account",
    loggedIn.profile.karma,
    0,
  );
  // 8. Validate account is active (not soft-deleted)
  TestValidator.predicate(
    "deleted_at is null for active account",
    loggedIn.deleted_at === null,
  );
}
