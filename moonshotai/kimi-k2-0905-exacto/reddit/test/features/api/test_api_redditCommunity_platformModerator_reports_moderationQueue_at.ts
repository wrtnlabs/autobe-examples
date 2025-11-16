import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationQueue";

export async function test_api_redditCommunity_platformModerator_reports_moderationQueue_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityModerationQueue =
    await api.functional.redditCommunity.platformModerator.reports.moderationQueue.at(
      connection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
