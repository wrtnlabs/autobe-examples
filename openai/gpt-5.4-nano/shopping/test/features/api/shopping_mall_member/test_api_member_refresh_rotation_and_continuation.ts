import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_rotation_and_continuation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(joined);
  const refreshToken1: string = joined.token.refresh;
  const refreshConnection1: api.IConnection = { host: connection.host };
  const refreshed2 = await authorize_member_refresh(refreshConnection1, {
    body: {
      refreshToken: refreshToken1,
    } satisfies IShoppingMallMember.IRefresh,
  });
  typia.assert(refreshed2);
  const refreshToken2: string = refreshed2.token.refresh;
  TestValidator.notEquals(
    "refresh token should rotate",
    refreshToken1,
    refreshToken2,
  );
  const refreshConnection2: api.IConnection = { host: connection.host };
  const refreshed3 = await authorize_member_refresh(refreshConnection2, {
    body: {
      refreshToken: refreshToken2,
    } satisfies IShoppingMallMember.IRefresh,
  });
  typia.assert(refreshed3);
  const refreshToken3: string = refreshed3.token.refresh;
  TestValidator.notEquals(
    "refresh token should rotate again",
    refreshToken2,
    refreshToken3,
  );
  TestValidator.equals("member id continuity", joined.id, refreshed2.id);
  TestValidator.equals(
    "member email continuity",
    joined.email,
    refreshed2.email,
  );
  TestValidator.equals("member id continuity", refreshed2.id, refreshed3.id);
  TestValidator.equals(
    "member email continuity",
    refreshed2.email,
    refreshed3.email,
  );
  // Rotation invalidation: refreshToken1 should not be usable anymore.
  // Expect authentication/session invalidation (commonly 401).
  await TestValidator.httpError(
    "old refresh token should be invalid after rotation",
    401,
    async () => {
      const refreshConnectionOld: api.IConnection = { host: connection.host };
      await authorize_member_refresh(refreshConnectionOld, {
        body: {
          refreshToken: refreshToken1,
        } satisfies IShoppingMallMember.IRefresh,
      });
    },
  );
}
