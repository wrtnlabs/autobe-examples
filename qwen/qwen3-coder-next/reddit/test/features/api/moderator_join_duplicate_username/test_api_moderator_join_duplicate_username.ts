import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_join_duplicate_username(
  connection: api.IConnection,
): Promise<void> {
  // First registration - create initial moderator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(adminConnection, {
    body: {} satisfies IRedditPlatformModerator.IJoin,
  });
  // Second registration attempt - same user should fail
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate username should be rejected",
    async () => {
      await authorize_moderator_join(secondConnection, {
        body: {} satisfies IRedditPlatformModerator.IJoin,
      });
    },
  );
}
