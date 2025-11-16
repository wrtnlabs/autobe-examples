import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAppeal";

export async function test_api_redditCommunity_platformModerator_moderations_appeals_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityAppeal =
    await api.functional.redditCommunity.platformModerator.moderations.appeals.at(
      connection,
      {
        moderationActionId: typia.random<string & tags.Format<"uuid">>(),
        appealId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
