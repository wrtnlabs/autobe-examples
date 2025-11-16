import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityKnowledgeBase } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKnowledgeBase";

export async function test_api_redditCommunity_knowledgeBase_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityKnowledgeBase =
    await api.functional.redditCommunity.knowledgeBase.at(connection, {
      knowledgeBaseId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
