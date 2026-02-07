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

/**
 * Test successful retrieval of banned users list for a community where the authenticated user has moderator privileges.
 * This scenario verifies: 1) Register and authenticate as moderator, 2) Call the banned users endpoint
 * and verify the response structure matches the IRedditPlatformBan.IInvert type.
 */
export async function test_api_moderator_banned_users_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  typia.assert(authorized);
  // 2. Get banned users list for a community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const bannedUsers =
    await api.functional.redditPlatform.moderator.communities.bans.getByCommunityid(
      moderatorConnection,
      { communityId },
    );
  typia.assert(bannedUsers);
  // 3. Validate response structure
  TestValidator.predicate(
    "response matches IInvert structure",
    typeof bannedUsers === "object" && bannedUsers !== null,
  );
}
