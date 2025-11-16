import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityKnowledgeBase } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKnowledgeBase";

export async function test_api_redditCommunity_knowledgeBase_categories_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityKnowledgeBase.ISummary =
    await api.functional.redditCommunity.knowledgeBase.categories.at(
      connection,
      {
        category: typia.random<string>(),
      },
    );
  typia.assert(output);
}
