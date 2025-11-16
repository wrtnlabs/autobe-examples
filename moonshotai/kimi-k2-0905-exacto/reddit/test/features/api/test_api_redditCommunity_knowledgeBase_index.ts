import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityKnowledgeBase } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityKnowledgeBase";
import { IRedditCommunityKnowledgeBase } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKnowledgeBase";

export async function test_api_redditCommunity_knowledgeBase_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityKnowledgeBase.ISummary =
    await api.functional.redditCommunity.knowledgeBase.index(connection, {
      body: typia.random<IRedditCommunityKnowledgeBase.IRequest>(),
    });
  typia.assert(output);
}
