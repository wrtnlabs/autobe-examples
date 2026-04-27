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

export async function test_api_member_token_refresh_session_continuation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member and capture initial tokens (token_set_1)
  const memberConnection: api.IConnection = { host: connection.host };
  const tokenSet1 = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(tokenSet1);
  // 2. Refresh with token_set_1's refresh_token → get token_set_2
  const refreshConnection1: api.IConnection = { host: connection.host };
  const tokenSet2 = await authorize_member_refresh(refreshConnection1, {
    body: {
      refresh_token: tokenSet1.token.refresh,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(tokenSet2);
  // 3. Refresh AGAIN with the ORIGINAL token_set_1.refresh_token (old token)
  //    → get token_set_3, confirming old tokens are NOT invalidated
  const refreshConnection2: api.IConnection = { host: connection.host };
  const tokenSet3 = await authorize_member_refresh(refreshConnection2, {
    body: {
      refresh_token: tokenSet1.token.refresh,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(tokenSet3);
  // 4. Verify each refresh call issued distinct access tokens
  TestValidator.notEquals(
    "token_set_2 access differs from token_set_1",
    tokenSet2.token.access,
    tokenSet1.token.access,
  );
  TestValidator.notEquals(
    "token_set_3 access differs from token_set_2",
    tokenSet3.token.access,
    tokenSet2.token.access,
  );
  TestValidator.notEquals(
    "token_set_3 access differs from token_set_1",
    tokenSet3.token.access,
    tokenSet1.token.access,
  );
  // 5. Verify each refresh call issued distinct refresh tokens
  TestValidator.notEquals(
    "token_set_2 refresh differs from token_set_1",
    tokenSet2.token.refresh,
    tokenSet1.token.refresh,
  );
  TestValidator.notEquals(
    "token_set_3 refresh differs from token_set_2",
    tokenSet3.token.refresh,
    tokenSet2.token.refresh,
  );
  TestValidator.notEquals(
    "token_set_3 refresh differs from token_set_1",
    tokenSet3.token.refresh,
    tokenSet1.token.refresh,
  );
  // 6. Verify expiration timestamps are in the future
  TestValidator.predicate(
    "token_set_2 access token has future expiration",
    new Date(tokenSet2.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "token_set_3 access token has future expiration",
    new Date(tokenSet3.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "token_set_2 refresh token has future expiration",
    new Date(tokenSet2.token.refreshable_until).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "token_set_3 refresh token has future expiration",
    new Date(tokenSet3.token.refreshable_until).getTime() > Date.now(),
  );
}
