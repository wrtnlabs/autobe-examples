import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostType";
import { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

export async function test_api_redditCommunity_postTypes_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityPostType.ISummary =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: typia.random<IRedditCommunityPostType.IRequest>(),
    });
  typia.assert(output);
}
