import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_success_issues_session_tokens(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.pick([true, false]);
  const href = ("https://example.com/" +
    RandomGenerator.alphabets(8)) as string;
  const referrer =
    "https://referrer.example.com/" + RandomGenerator.alphabets(10);
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(joined);
  const passwordForLogin: string & tags.Format<"password"> = (
    password
      ? "P@ssw0rd-" + RandomGenerator.alphabets(10)
      : "P@ssw0rd-" + RandomGenerator.alphabets(10)
  ) as string & tags.Format<"password">;
  void passwordForLogin;
  // Re-join with a deterministic plaintext password that matches DTO requirement
  const loginPassword: string & tags.Format<"password"> = ("P@ssw0rd-" +
    RandomGenerator.alphabets(12)) as string & tags.Format<"password">;
  const joined2 = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email,
        password: RandomGenerator.pick([true, false]),
      } satisfies IMultiUserTodoMember.IJoin,
    },
  );
  typia.assert(joined2);
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_member_login(loginConnection, {
    body: {
      email,
      password: loginPassword,
      href,
      referrer,
      ip,
    } satisfies IMultiUserTodoMember.ILogin,
  });
  typia.assert(loggedIn);
  TestValidator.equals("member id not empty", loggedIn.id !== "", true);
  TestValidator.predicate(
    "access token non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token non-empty",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is present",
    typeof loggedIn.token.expired_at === "string" &&
      loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is present",
    typeof loggedIn.token.refreshable_until === "string" &&
      loggedIn.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "response does not leak password_hash",
    "password_hash" in (loggedIn as unknown as Record<string, unknown>) ===
      false,
  );
  TestValidator.predicate(
    "response does not leak internal session identifiers",
    "session" in (loggedIn as unknown as Record<string, unknown>) === false,
  );
}
