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

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const displayName = RandomGenerator.name();
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      name: displayName,
      href: "https://example.com/signup",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IErpHrmTimeMember.ILogin,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "member email matches login email",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "member display name matches join name",
    authorized.displayName,
    displayName,
  );
  TestValidator.equals(
    "member id matches joined account",
    authorized.id,
    joined.id,
  );
  TestValidator.predicate(
    "access token is issued",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is issued",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access expiration is present",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh expiration is present",
    authorized.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "access token and refresh token are different",
    authorized.token.access !== authorized.token.refresh,
  );
  TestValidator.predicate(
    "access token expiration is in the future",
    Date.parse(authorized.token.expired_at) > Date.now(),
  );
  TestValidator.predicate(
    "refresh expiration is not before access expiration",
    Date.parse(authorized.token.refreshable_until) >=
      Date.parse(authorized.token.expired_at),
  );
  TestValidator.equals(
    "avatar is not set on new account",
    authorized.avatarImageUrl,
    null,
  );
  TestValidator.equals(
    "phone number is not set on new account",
    authorized.phoneNumber,
    null,
  );
  TestValidator.equals("account is active", authorized.deletedAt, null);
}
