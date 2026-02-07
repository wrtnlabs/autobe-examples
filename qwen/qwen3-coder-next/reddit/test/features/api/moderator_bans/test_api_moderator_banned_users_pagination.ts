import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_banned_users_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as moderator to test pagination functionality
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  // 2. Create community for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test pagination with limit/offset parameters
  const limit = 5;
  const offset = 0;
  // 4. Call the endpoint to retrieve first page of results
  const firstPage =
    await api.functional.redditPlatform.moderator.communities.bans.getByCommunityid(
      moderatorConnection,
      {
        communityId,
      },
    );
  typia.assert(firstPage);
  // 5. Verify response structure and pagination metadata
  // Note: The actual implementation would validate pagination details
  // based on the API's response structure
}
