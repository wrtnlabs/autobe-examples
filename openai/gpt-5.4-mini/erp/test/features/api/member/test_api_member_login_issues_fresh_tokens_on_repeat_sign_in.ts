import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_issues_fresh_tokens_on_repeat_sign_in(
  connection: api.IConnection,
): Promise<void> {
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password,
  } satisfies IHrmTimeTrackingMember.ILogin;
  const firstLogin = await authorize_member_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(firstLogin);
  const secondLogin = await authorize_member_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(secondLogin);
  TestValidator.equals(
    "member id should stay the same",
    secondLogin.id,
    firstLogin.id,
  );
  TestValidator.equals(
    "member email should stay the same",
    secondLogin.email,
    firstLogin.email,
  );
  TestValidator.equals(
    "member should remain active",
    secondLogin.isActive,
    firstLogin.isActive,
  );
  TestValidator.notEquals(
    "access token should be refreshed on repeat sign-in",
    firstLogin.token.access,
    secondLogin.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be refreshed on repeat sign-in",
    firstLogin.token.refresh,
    secondLogin.token.refresh,
  );
  TestValidator.notEquals(
    "access token expiration should be refreshed on repeat sign-in",
    firstLogin.token.expired_at,
    secondLogin.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable deadline should be refreshed on repeat sign-in",
    firstLogin.token.refreshable_until,
    secondLogin.token.refreshable_until,
  );
}
