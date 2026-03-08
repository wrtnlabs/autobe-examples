import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_with_stale_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(member);
  // 2. Login to establish valid session
  const loginConnection: api.IConnection = { host: connection.host };
  const session = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
      href: "https://example.com/login",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies ITodoAppMemberSession.ILogin,
  });
  typia.assert(session);
  // 3. Create connection with invalid token to simulate stale session
  const staleConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: "invalid_expired_token_12345",
    },
  };
  // 4. Attempt profile update with invalid session - should fail with 401
  const updateBody = {
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppProfile.IUpdate;
  await TestValidator.error("invalid session should be rejected", async () => {
    await api.functional.todoApp.member.profile.patch(staleConnection, {
      body: updateBody,
    });
  });
}
