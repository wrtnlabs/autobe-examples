import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";

export async function test_api_redditCommunity_communityModerator_communities_moderationActions_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityModerationAction =
    await api.functional.redditCommunity.communityModerator.communities.moderationActions.create(
      connection,
      {
        communityName: typia.random<string>(),
        body: typia.random<IRedditCommunityModerationAction.ICreate>(),
      },
    );
  typia.assert(output);
}
