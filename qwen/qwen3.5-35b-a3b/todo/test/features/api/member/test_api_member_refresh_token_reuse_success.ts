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

export async function test_api_member_refresh_token_reuse_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member to obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: typia.random<IMultiUserTodoMember.IJoin>(),
  });
  typia.assert(member);
  // 2. First refresh using the initial refresh token
  const refreshConnection1: api.IConnection = { host: connection.host };
  const firstRefresh = await authorize_member_refresh(refreshConnection1, {
    body: {
      refresh_token: member.token.refresh,
    } satisfies IMultiUserTodoMember.IRefresh,
  });
  typia.assert(firstRefresh);
  // 3. Second refresh using the SAME original refresh token
  const refreshConnection2: api.IConnection = { host: connection.host };
  const secondRefresh = await authorize_member_refresh(refreshConnection2, {
    body: {
      refresh_token: member.token.refresh,
    } satisfies IMultiUserTodoMember.IRefresh,
  });
  typia.assert(secondRefresh);
  // 4. Validate refresh tokens were different from original
  TestValidator.notEquals(
    "first refresh token differs",
    member.token.refresh,
    firstRefresh.token.refresh,
  );
  TestValidator.notEquals(
    "second refresh token differs",
    member.token.refresh,
    secondRefresh.token.refresh,
  );
  // 5. Validate access tokens were different from original
  TestValidator.notEquals(
    "first access token differs",
    member.token.access,
    firstRefresh.token.access,
  );
  TestValidator.notEquals(
    "second access token differs",
    member.token.access,
    secondRefresh.token.access,
  );
  // 6. Validate refreshable_until timestamps are updated
  TestValidator.notEquals(
    "first refreshable_until updated",
    member.token.refreshable_until,
    firstRefresh.token.refreshable_until,
  );
  TestValidator.notEquals(
    "second refreshable_until updated",
    member.token.refreshable_until,
    secondRefresh.token.refreshable_until,
  );
  // 7. Validate expiration timestamps are updated
  TestValidator.notEquals(
    "first expired_at updated",
    member.token.expired_at,
    firstRefresh.token.expired_at,
  );
  TestValidator.notEquals(
    "second expired_at updated",
    member.token.expired_at,
    secondRefresh.token.expired_at,
  );
}
