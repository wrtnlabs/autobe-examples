import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityKnowledgeBase } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKnowledgeBase";

export async function test_api_redditCommunity_platformModerator_knowledgeBase_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityKnowledgeBase =
    await api.functional.redditCommunity.platformModerator.knowledgeBase.create(
      connection,
      {
        body: typia.random<IRedditCommunityKnowledgeBase.ICreate>(),
      },
    );
  typia.assert(output);
}
