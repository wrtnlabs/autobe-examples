import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
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
  // 1. Create a new member account to obtain valid refresh token
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>() satisfies string as string),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(joinResult);
  // 2. Prepare refresh request with the valid refresh token
  const refreshBody = {
    refresh_token: joinResult.refresh_token.refresh_token,
  } satisfies ITodoAppMemberSession.IRefresh;
  // 3. Execute token refresh
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: refreshBody,
  });
  typia.assert(refreshResult);
  // 4. Validate refresh response structure
  typia.assert<ITodoAppMemberSession.ISummary>(refreshResult.member);
  typia.assert<ITodoAppMemberSession.IAuthenticationToken>(
    refreshResult.access_token,
  );
  typia.assert<ITodoAppMemberSession.IAuthenticationToken>(
    refreshResult.refresh_token,
  );
  typia.assert<IAuthorizationToken>(refreshResult.token);
  // 5. Validate authentication tokens
  typia.assert<string>(refreshResult.access_token.access_token);
  typia.assert<string>(refreshResult.refresh_token.refresh_token);
  typia.assert<string>(refreshResult.access_token.access_expires_at);
  typia.assert<string>(refreshResult.refresh_token.refresh_expires_at);
  // 6. Validate member information
  typia.assert<string & tags.Format<"uuid">>(refreshResult.member.id);
  typia.assert<string>(refreshResult.member.email);
  typia.assert<string>(refreshResult.member.displayName);
}