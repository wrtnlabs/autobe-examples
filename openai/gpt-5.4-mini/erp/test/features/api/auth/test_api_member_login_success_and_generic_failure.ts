import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_success_and_generic_failure(
  connection: api.IConnection,
): Promise<void> {
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Test1234!" as string & tags.Format<"password">;
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  TestValidator.equals("joined member email", joined.email, memberEmail);
  TestValidator.predicate(
    "joined token access exists",
    joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "joined token refresh exists",
    joined.token.refresh.length > 0,
  );
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_member_login(loginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IErpHrmTimeMember.ILogin,
  });
  typia.assert(loggedIn);
  TestValidator.equals("login member id matches join", loggedIn.id, joined.id);
  TestValidator.equals("login email matches join", loggedIn.email, memberEmail);
  TestValidator.equals(
    "login display name matches join",
    loggedIn.displayName,
    joined.displayName,
  );
  TestValidator.equals(
    "login avatar image url matches join",
    loggedIn.avatarImageUrl,
    joined.avatarImageUrl,
  );
  TestValidator.equals(
    "login phone number matches join",
    loggedIn.phoneNumber,
    joined.phoneNumber,
  );
  TestValidator.equals("login deletedAt is null", loggedIn.deletedAt, null);
  TestValidator.predicate(
    "login createdAt is present",
    loggedIn.createdAt.length > 0,
  );
  TestValidator.predicate(
    "login updatedAt is present",
    loggedIn.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "login token access exists",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token refresh exists",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "fresh login returns a fresh access token",
    joined.token.access,
    loggedIn.token.access,
  );
  TestValidator.notEquals(
    "fresh login returns a fresh refresh token",
    joined.token.refresh,
    loggedIn.token.refresh,
  );
  await TestValidator.httpError(
    "generic failure for invalid credentials",
    [401, 403],
    async () => {
      const invalidConnection: api.IConnection = { host: connection.host };
      await authorize_member_login(invalidConnection, {
        body: {
          email: `invalid.${memberEmail}` as string & tags.Format<"email">,
          password: "WrongPassword123!" as string & tags.Format<"password">,
        } satisfies IErpHrmTimeMember.ILogin,
      });
    },
  );
}
