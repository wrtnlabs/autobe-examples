import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationQueue";

export async function test_api_redditCommunity_communityModerator_moderationQueues_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityModerationQueue =
    await api.functional.redditCommunity.communityModerator.moderationQueues.create(
      connection,
      {
        body: typia.random<IRedditCommunityModerationQueue.ICreate>(),
      },
    );
  typia.assert(output);
}
