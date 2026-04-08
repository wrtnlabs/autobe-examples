import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.name(1);
  const joinBody = {
    email,
    password,
    username,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCloneMember.IJoin;
  const joinResponse = await api.functional.redditClone.auth.member.join(
    connection,
    { body: joinBody },
  );
  typia.assert(joinResponse);
  // Store registered member info for comparison
  const registeredMemberId = joinResponse.id;
  const registeredUsername = joinResponse.username;
  // 2. Log in using the same credentials
  const loginBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCloneMember.ILogin;
  const loginResponse = await api.functional.redditClone.auth.member.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loginResponse);
  // 3. Validate login response tokens
  TestValidator.predicate(
    "access token is non-empty string",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    loginResponse.token.refresh.length > 0,
  );
  // Validate token expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(loginResponse.token.expired_at);
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  // 4. Validate member information matches registered account
  TestValidator.equals(
    "member id matches",
    loginResponse.id,
    registeredMemberId,
  );
  TestValidator.equals(
    "username matches",
    loginResponse.username,
    registeredUsername,
  );
  TestValidator.equals(
    "displayName matches",
    loginResponse.displayName,
    joinResponse.displayName,
  );
}
