import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Use a separate connection for moderator (actor specific)
  const moderatorConnection: api.IConnection = { host: connection.host };
  // 1. Create moderator account to setup context
  await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  // 2. Call refresh with empty body, which is invalid scenario
  await TestValidator.error("refresh rejected with empty body", async () => {
    await authorize_moderator_refresh(moderatorConnection, {
      body: {},
    });
  });
}
