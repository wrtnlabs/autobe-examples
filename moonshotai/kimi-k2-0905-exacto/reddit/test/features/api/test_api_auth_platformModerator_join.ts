import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformModerator";

export async function test_api_auth_platformModerator_join(
  connection: api.IConnection,
) {
  const output: IRedditCommunityPlatformModerator.IAuthorized =
    await api.functional.auth.platformModerator.join(connection, {
      body: typia.random<IRedditCommunityPlatformModerator.ICreate>(),
    });
  typia.assert(output);
}
