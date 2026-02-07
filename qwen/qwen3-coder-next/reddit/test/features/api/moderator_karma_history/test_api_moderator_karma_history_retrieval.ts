import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformKarmaHistory";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_karma_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a moderator account for authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  await api.functional.redditPlatform.auth.moderator.join(moderatorConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  // Step 2: Test retrieval of karma history with valid moderator authentication
  const karmaHistoryId = typia.random<string & typia.tags.Format<"uuid">>();
  const karmaHistory: IRedditPlatformKarmaHistory =
    await api.functional.redditPlatform.moderator.karma_histories.at(
      moderatorConnection,
      {
        historyId: karmaHistoryId,
      },
    );
  typia.assert(karmaHistory);
}
