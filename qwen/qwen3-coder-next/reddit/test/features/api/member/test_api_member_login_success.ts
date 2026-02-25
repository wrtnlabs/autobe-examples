import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
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
  // 1. Create a new member account first
  const registerConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    displayName: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCloneMember.IJoin;
  const registered = await authorize_member_join(registerConnection, {
    body: memberData,
  });
  typia.assert(registered);
  // 2. Login with the created member credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginData = {
    email: memberData.email,
    password: memberData.password,
  } satisfies IRedditCloneMember.ILogin;
  const logged = await authorize_member_login(loginConnection, {
    body: loginData,
  });
  typia.assert(logged);
  // 3. Validate login response structure
  TestValidator.equals("member id matches", logged.id, registered.id);
  TestValidator.equals("email matches", logged.email, memberData.email);
  TestValidator.equals(
    "username matches",
    logged.username,
    memberData.username,
  );
  TestValidator.equals(
    "display name matches",
    logged.displayName,
    memberData.displayName,
  );
  // 4. Validate token structure exists and is valid
  TestValidator.predicate("has access token", logged.token.access.length > 0);
  TestValidator.predicate("has refresh token", logged.token.refresh.length > 0);
  TestValidator.predicate(
    "has valid expiry",
    new Date(logged.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "has valid refreshable until",
    new Date(logged.token.refreshable_until) > new Date(),
  );
  // 5. Validate karma score initialization
  TestValidator.equals("karma starts at 0", logged.karma, 0);
  // 6. Validate createdAt timestamp
  TestValidator.predicate(
    "has valid creation date",
    new Date(logged.createdAt) <= new Date(),
  );
}
