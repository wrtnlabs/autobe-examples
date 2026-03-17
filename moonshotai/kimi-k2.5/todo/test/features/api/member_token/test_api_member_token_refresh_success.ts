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

export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"url">>(),
    referrer: typia.random<string & tags.Format<"url">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IMultiUserTodoMember.IJoin;
  const initialAuth = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(initialAuth);
  const oldRefreshToken: string = initialAuth.token.refresh;
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_member_refresh(refreshConnection, {
    body: { refreshToken: oldRefreshToken },
  });
  typia.assert(refreshedAuth);

  TestValidator.equals("member id matches", refreshedAuth.id, initialAuth.id);
  TestValidator.equals(
    "member email matches",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "member creation timestamp matches",
    refreshedAuth.created_at,
    initialAuth.created_at,
  );

  TestValidator.notEquals(
    "access token refreshed",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );

  await TestValidator.error(
    "old refresh token should be invalidated",
    async () => {
      const errorConnection: api.IConnection = { host: connection.host };
      await authorize_member_refresh(errorConnection, {
        body: { refreshToken: oldRefreshToken },
      });
    },
  );
}