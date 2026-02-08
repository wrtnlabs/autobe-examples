import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_community_user_ban_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // Test banning a user twice in one community to ensure duplicate ban prevention
  // Step 1: Moderator join to get authorized connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinPayload: ICommunityPlatformModerator.IJoin = {};
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: joinPayload,
  });
  typia.assert(authorized);
  moderatorConnection.headers = { Authorization: authorized.token.access };
  // Step 2: Prepare test data for banning user in a community
  // We need a valid communityId (uuid) and userId to ban with a banReason
  // Since no generation functions are given, we generate random UUIDs and strings
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const userId = typia.random<string & tags.Format<"uuid">>();
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  // Step 3: First ban attempt - should succeed
  const firstBanBody: ICommunityPlatformCommunityBannedUser.IBan = {
    userId,
    banReason,
  };
  const firstBan =
    await api.functional.communityPlatform.moderator.communities.banned_users.ban(
      moderatorConnection,
      {
        communityId,
        body: firstBanBody,
      },
    );
  typia.assert(firstBan);
  // Step 4: Second ban attempt with the same user and community - should fail with error
  await TestValidator.error("duplicate ban attempt", async () => {
    await api.functional.communityPlatform.moderator.communities.banned_users.ban(
      moderatorConnection,
      {
        communityId,
        body: firstBanBody,
      },
    );
  });
}
