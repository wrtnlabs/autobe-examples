import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";

export async function test_api_redditCommunity_platformModerator_moderationActions_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityModerationAction =
    await api.functional.redditCommunity.platformModerator.moderationActions.index(
      connection,
      {
        body: typia.random<IRedditCommunityModerationAction.IRequest>(),
      },
    );
  typia.assert(output);
}
