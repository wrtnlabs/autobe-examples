import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageIRedditCommunityAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityAppeal";
import { IRedditCommunityAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAppeal";

export async function test_api_redditCommunity_platformModerator_moderations_appeals_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityAppeal.ISummary =
    await api.functional.redditCommunity.platformModerator.moderations.appeals.index(
      connection,
      {
        moderationActionId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditCommunityAppeal.IRequest>(),
      },
    );
  typia.assert(output);
}
