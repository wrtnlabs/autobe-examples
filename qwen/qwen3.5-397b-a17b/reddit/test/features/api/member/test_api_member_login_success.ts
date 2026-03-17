import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member authentication with valid credentials.
 * 1. Create a new member account via join with valid email, password, and username
 * 2. Login using the same email and password credentials
 * 3. Validate response contains valid JWT tokens and member profile information
 * 4. Verify expiration timestamps are properly set
 * 5. Confirm authentication state is properly established
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCloneMember.IJoin;
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: joinData,
  });
  typia.assert(joinResult);
  // Step 2: Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinData.email,
      password: joinData.password,
    } satisfies IRedditCloneMember.ILogin,
  });
  typia.assert(loginResult);
  // Step 3: Validate member profile information matches between join and login
  TestValidator.equals("member id matches", loginResult.id, joinResult.id);
  TestValidator.equals(
    "username matches",
    loginResult.username,
    joinResult.username,
  );
  TestValidator.equals(
    "display_name matches",
    loginResult.display_name,
    joinResult.display_name,
  );
  TestValidator.equals("email matches", loginResult.email, joinData.email);
  // Step 4: Validate token structure exists and is properly formed
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(loginResult.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(loginResult.token.refreshable_until).getTime() >
      new Date(loginResult.token.expired_at).getTime(),
  );
  // Step 5: Validate karma_score is properly initialized
  TestValidator.predicate(
    "karma_score score is number",
    typeof loginResult.karma_score.score === "number",
  );
  TestValidator.equals(
    "karma_score member id matches",
    loginResult.karma_score.member.id,
    loginResult.id,
  );
  // Step 6: Validate account timestamps
  TestValidator.predicate(
    "created_at is valid",
    new Date(loginResult.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    new Date(loginResult.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    loginResult.deleted_at,
    null,
  );
}
