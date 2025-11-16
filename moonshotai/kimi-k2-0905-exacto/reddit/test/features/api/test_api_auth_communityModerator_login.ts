import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function test_api_auth_communityModerator_login(
  connection: api.IConnection,
) {
  const output: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: typia.random<IRedditCommunityCommunityModerator.ILogin>(),
    });
  typia.assert(output);
}
