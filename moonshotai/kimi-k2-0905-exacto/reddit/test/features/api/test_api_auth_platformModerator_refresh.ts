import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformModerator";

export async function test_api_auth_platformModerator_refresh(
  connection: api.IConnection,
) {
  const output: IRedditCommunityPlatformModerator.IAuthorized =
    await api.functional.auth.platformModerator.refresh(connection, {
      body: typia.random<IRedditCommunityPlatformModerator.IRefresh>(),
    });
  typia.assert(output);
}
