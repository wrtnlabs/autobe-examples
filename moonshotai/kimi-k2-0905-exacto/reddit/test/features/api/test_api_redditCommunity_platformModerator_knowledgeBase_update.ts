import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityKnowledgeBase } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKnowledgeBase";

export async function test_api_redditCommunity_platformModerator_knowledgeBase_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityKnowledgeBase =
    await api.functional.redditCommunity.platformModerator.knowledgeBase.update(
      connection,
      {
        knowledgeBaseId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditCommunityKnowledgeBase.IUpdate>(),
      },
    );
  typia.assert(output);
}
