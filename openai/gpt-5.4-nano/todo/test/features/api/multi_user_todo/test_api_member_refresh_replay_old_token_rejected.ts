import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_replay_old_token_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const display_name = RandomGenerator.name();
  const password = typia.random<
    string & tags.MinLength<1> & tags.Format<"password">
  >();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const joined = await authorize_member_join(memberConnection, {
    body: {
      display_name,
      password,
      href,
      referrer,
      ip,
    },
  });
  typia.assert(joined);
  const tokenR0 = joined.token.refresh;
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const refreshedOnce = await authorize_member_refresh(firstRefreshConnection, {
    body: {
      refreshToken: tokenR0,
    },
  });
  typia.assert(refreshedOnce);
  const tokenR1 = refreshedOnce.token.refresh;
  TestValidator.notEquals("refresh rotated", tokenR0, tokenR1);
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "old refresh token replay should be rejected",
    async () => {
      const replayResult = await authorize_member_refresh(
        secondRefreshConnection,
        {
          body: {
            refreshToken: tokenR0,
          },
        },
      );
      // If the replay unexpectedly succeeds, force test failure.
      typia.assert(replayResult);
      throw new Error("refresh token replay unexpectedly succeeded");
    },
  );
}
