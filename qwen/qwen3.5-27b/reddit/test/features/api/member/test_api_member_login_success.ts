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
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.name(2),
    bio: null,
    avatar_uri: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCloneMember.IJoin;
  const joinedMember = await authorize_member_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(joinedMember);
  // 2. Login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCloneMember.ILogin;
  const loggedInMember = await authorize_member_login(loginConnection, {
    body: loginInput,
  });
  typia.assert(loggedInMember);
  // 3. Validate member profile data matches registration
  TestValidator.equals("email matches", loggedInMember.email, joinInput.email);
  TestValidator.equals(
    "username matches",
    loggedInMember.username,
    joinInput.username,
  );
  TestValidator.equals(
    "display_name matches",
    loggedInMember.display_name,
    joinInput.display_name!,
  );
  TestValidator.equals("bio matches", loggedInMember.bio, joinInput.bio);
  TestValidator.equals(
    "avatar_uri matches",
    loggedInMember.avatar_uri,
    joinInput.avatar_uri,
  );
  // 4. Validate new member state
  TestValidator.equals("karma initialized to 0", loggedInMember.karma, 0);
  TestValidator.equals(
    "account is active (deleted_at is null)",
    loggedInMember.deleted_at,
    null,
  );
  // 5. Validate token structure
  TestValidator.predicate(
    "access token exists",
    loggedInMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loggedInMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at exists",
    loggedInMember.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    loggedInMember.token.refreshable_until.length > 0,
  );
  // 6. Validate token expiration times
  const now = new Date();
  const expiredAt = new Date(loggedInMember.token.expired_at);
  const refreshableUntil = new Date(loggedInMember.token.refreshable_until);
  TestValidator.predicate(
    "access token expires in the future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token valid until is in the future",
    refreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token valid until is after access token expiration",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
}
