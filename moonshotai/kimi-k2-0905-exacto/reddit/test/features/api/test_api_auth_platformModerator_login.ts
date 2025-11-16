import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformModerator";

export async function test_api_auth_platformModerator_login(
  connection: api.IConnection,
) {
  const output: IRedditCommunityPlatformModerator.IAuthorized =
    await api.functional.auth.platformModerator.login(connection, {
      body: typia.random<IRedditCommunityPlatformModerator.Login>(),
    });
  typia.assert(output);
}
