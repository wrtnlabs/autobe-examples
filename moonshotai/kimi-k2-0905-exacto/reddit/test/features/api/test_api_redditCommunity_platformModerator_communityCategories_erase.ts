import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_redditCommunity_platformModerator_communityCategories_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.redditCommunity.platformModerator.communityCategories.erase(
      connection,
      {
        categoryId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
