import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationQueue";

export async function test_api_redditCommunity_platformModerator_moderationQueues_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityModerationQueue =
    await api.functional.redditCommunity.platformModerator.moderationQueues.at(
      connection,
      {
        queueId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
