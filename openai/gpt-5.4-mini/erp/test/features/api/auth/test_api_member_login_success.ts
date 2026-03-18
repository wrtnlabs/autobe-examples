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

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IHrmTimeTrackingMember.ILogin,
  });
  typia.assert(loggedIn);
  TestValidator.equals("member id should be preserved", loggedIn.id, joined.id);
  TestValidator.equals(
    "member email should be preserved",
    loggedIn.email,
    email,
  );
  TestValidator.predicate(
    "member should be active after login",
    loggedIn.isActive,
  );
  TestValidator.predicate(
    "login should update lastLoginAt",
    loggedIn.lastLoginAt !== null,
  );
  TestValidator.predicate(
    "access token should not be empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should not be empty",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should be after now",
    new Date(loggedIn.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refresh token deadline should be after access expiration",
    new Date(loggedIn.token.refreshable_until).getTime() >=
      new Date(loggedIn.token.expired_at).getTime(),
  );
}
