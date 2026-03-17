import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies Partial<ITodoAppMember.IJoin>;
  const authorized: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body,
    },
  );
  typia.assert(authorized);
  TestValidator.equals(
    "registered email matches input",
    authorized.email,
    body.email,
  );
  TestValidator.equals(
    "active account has no deletion timestamp",
    authorized.deleted_at,
    null,
  );
  TestValidator.equals(
    "authorization header is set to issued access token",
    memberConnection.headers?.Authorization,
    authorized.token.access,
  );
  TestValidator.notEquals(
    "access and refresh tokens are different",
    authorized.token.access,
    authorized.token.refresh,
  );
  TestValidator.predicate("member id is non-empty", authorized.id.length > 0);
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "created_at is parseable",
    Number.isFinite(new Date(authorized.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is parseable",
    Number.isFinite(new Date(authorized.updated_at).getTime()),
  );
  TestValidator.predicate(
    "token expiration is parseable",
    Number.isFinite(new Date(authorized.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "token refresh deadline is parseable",
    Number.isFinite(new Date(authorized.token.refreshable_until).getTime()),
  );
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    new Date(authorized.updated_at).getTime() >=
      new Date(authorized.created_at).getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is not earlier than expired_at",
    new Date(authorized.token.refreshable_until).getTime() >=
      new Date(authorized.token.expired_at).getTime(),
  );
}
