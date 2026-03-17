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

export async function test_api_member_refresh_after_session_expired(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  const authorized: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: joinBody,
    },
  );
  typia.assert(authorized);
  const token: IAuthorizationToken = authorized.token;
  const refreshBody = {
    refresh: token.refresh,
  } satisfies ITodoAppMember.IRefresh;
  TestValidator.equals(
    "joined member email matches input",
    authorized.email,
    joinBody.email,
  );
  TestValidator.equals(
    "refresh body uses issued refresh token",
    refreshBody.refresh,
    token.refresh,
  );
  const refreshDeadline: number = new Date(token.refreshable_until).getTime();
  const now: number = Date.now();
  TestValidator.predicate(
    "session refreshable lifetime has already passed for this test environment",
    refreshDeadline <= now,
  );
  const expiredRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "refresh is rejected after session expiration boundary passes",
    async () => {
      await authorize_member_refresh(expiredRefreshConnection, {
        body: refreshBody,
      });
    },
  );
}
