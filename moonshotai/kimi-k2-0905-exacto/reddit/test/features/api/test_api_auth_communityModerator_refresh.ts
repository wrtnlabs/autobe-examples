import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function test_api_auth_communityModerator_refresh(
  connection: api.IConnection,
) {
  const output: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.refresh(connection, {
      body: typia.random<IRedditCommunityCommunityModerator.IRefresh>(),
    });
  typia.assert(output);
}
