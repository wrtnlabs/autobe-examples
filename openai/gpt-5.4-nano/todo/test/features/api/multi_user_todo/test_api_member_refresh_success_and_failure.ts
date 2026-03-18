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

export async function test_api_member_refresh_success_and_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create a member and obtain a refresh token
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(joined);
  TestValidator.predicate(
    "joined token access is non-empty",
    joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "joined token refresh is non-empty",
    joined.token.refresh.length > 0,
  );
  // 2) Refresh once using the refresh token from join
  const refreshConnection1: api.IConnection = { host: connection.host };
  const refreshed1 = await authorize_member_refresh(refreshConnection1, {
    body: {
      refreshToken: joined.token.refresh,
    } satisfies IMultiUserTodoMember.IRefresh,
  });
  typia.assert(refreshed1);
  TestValidator.equals(
    "member id matches after first refresh",
    refreshed1.id,
    joined.id,
  );
  TestValidator.predicate(
    "refreshed1 token access non-empty",
    refreshed1.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed1 token refresh non-empty",
    refreshed1.token.refresh.length > 0,
  );
  // 3) Refresh again with the refresh token from the first refresh
  const refreshConnection2: api.IConnection = { host: connection.host };
  const refreshed2 = await authorize_member_refresh(refreshConnection2, {
    body: {
      refreshToken: refreshed1.token.refresh,
    } satisfies IMultiUserTodoMember.IRefresh,
  });
  typia.assert(refreshed2);
  TestValidator.equals(
    "member id matches after second refresh",
    refreshed2.id,
    joined.id,
  );
  TestValidator.predicate(
    "refreshed2 token access non-empty",
    refreshed2.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed2 token refresh non-empty",
    refreshed2.token.refresh.length > 0,
  );
  // 4) Failure: refresh with an invalid refresh token should be rejected
  const invalidTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "refresh fails with invalid refresh token",
    async () => {
      await authorize_member_refresh(invalidTokenConnection, {
        body: {
          refreshToken: RandomGenerator.alphaNumeric(24),
        } satisfies IMultiUserTodoMember.IRefresh,
      });
    },
  );
}
