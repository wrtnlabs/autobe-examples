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

export async function test_api_member_refresh_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      displayName: RandomGenerator.name(),
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Store refresh token before deletion
  const originalRefreshToken = member.token.refresh;
  // 3. Delete member account (need to use SDK directly since no utility available)
  // First need to login with the member credentials to get connection for deletion
  const deleteConnection: api.IConnection = { host: connection.host };
  const login = await authorize_member_login(deleteConnection, {
    body: {
      email: member.email,
      password: password,
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(login);
  // 4. Attempt to refresh with the old refresh token (should fail)
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("refresh fails for deleted account", async () => {
    await authorize_member_refresh(refreshConnection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies ITodoAppMember.IRefresh,
    });
  });
}