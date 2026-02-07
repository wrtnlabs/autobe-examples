import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_ban_retrieval_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection without any authentication token
  const unauthConnection: api.IConnection = { host: connection.host };
  // Attempt to retrieve a ban record without authentication
  await TestValidator.error(
    "unauthorized access should throw 401",
    async () => {
      await api.functional.redditPlatform.moderator.bans.at(unauthConnection, {
        banId: "00000000-0000-0000-0000-000000000000",
      });
    },
  );
}
