import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";
import type { IEconDiscussVerifiedExpertLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertLogin";

export async function test_api_verified_expert_login_success(
  connection: api.IConnection,
) {
  // 1) Prepare a fresh verified expert account payload (join)
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();
  const displayName = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<120>
  >();
  const avatarUri = typia.random<string & tags.Format<"uri">>();

  const joinBody = {
    email,
    password,
    display_name: displayName,
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: avatarUri,
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;

  // 2) Join: create the account and receive initial tokens
  const joined = await api.functional.auth.verifiedExpert.join(connection, {
    body: joinBody,
  });
  typia.assert(joined);

  // Basic business validations after join
  TestValidator.equals(
    "role is verifiedExpert after join",
    joined.role,
    "verifiedExpert",
  );
  TestValidator.predicate(
    "join issues access token",
    joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "join issues refresh token",
    joined.token.refresh.length > 0,
  );

  // 3) Login with the same credentials
  const loginBody = {
    email,
    password,
  } satisfies IEconDiscussVerifiedExpertLogin.ICreate;

  const loggedIn = await api.functional.auth.verifiedExpert.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedIn);

  // 4) Validate identity continuity and session envelope
  TestValidator.equals(
    "login subject matches joined account id",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "role is verifiedExpert after login",
    loggedIn.role,
    "verifiedExpert",
  );
  TestValidator.predicate(
    "login issues access token",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "login issues refresh token",
    loggedIn.token.refresh.length > 0,
  );
}
