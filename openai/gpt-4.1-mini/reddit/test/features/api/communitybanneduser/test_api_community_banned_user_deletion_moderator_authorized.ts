import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_moderator_communities_banned_users_create_banned_user } from "../../../generate/generate_random_community_platform_moderator_communities_banned_users_create_banned_user";
import { prepare_random_community_platform_community_banned_user } from "../../../prepare/prepare_random_community_platform_community_banned_user";

export async function test_api_community_banned_user_deletion_moderator_authorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of a banned user entry by a moderator
  // Prepare moderator connection and authorize join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, { body: {} });
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // Prepare another moderator connection for ban creation - simulate other actor
  const otherModeratorConnection: api.IConnection = { host: connection.host };
  const otherModeratorAuth = await authorize_moderator_join(
    otherModeratorConnection,
    { body: {} },
  );
  otherModeratorConnection.headers = {
    Authorization: `Bearer ${otherModeratorAuth.token.access}`,
  };
  // Create a random community summary to associate banned user record
  // Since no direct community creation API, we assume the banned user creation requires a communityId
  // We simulate communityId from the banned user creation response later
  // For test purpose, generate a banned user record under otherModerator
  const bannedUserRecord =
    await generate_random_community_platform_moderator_communities_banned_users_create_banned_user(
      otherModeratorConnection,
      { params: { communityId: typia.random<string & tags.Format<"uuid">>() } },
    );
  typia.assert(bannedUserRecord);
  // Scenario step 3: Delete the banned user record by moderator
  // Expected success: HTTP 204 No Content
  await api.functional.communityPlatform.moderator.communities.banned_users.erase(
    moderatorConnection,
    { communityId: bannedUserRecord.community.id, banId: bannedUserRecord.id },
  );
  // Scenario step 4: Confirm the banned user entry no longer exists in the list
  // The problem is no direct GET banned users API provided for listing, so we can't do real confirmation
  // But based on API specification, deletion means ban record is removed
  // Scenario 2: Unauthorized attempt to delete a banned user entry
  // Prepare unauthorized user connection (normal user simulated as moderator without ban privileges)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedAuth = await authorize_moderator_join(
    unauthorizedConnection,
    { body: {} },
  );
  unauthorizedConnection.headers = {
    Authorization: `Bearer ${unauthorizedAuth.token.access}`,
  };
  // Create banned user record with other moderator (to have a banId target)
  const bannedUserForUnauthorized =
    await generate_random_community_platform_moderator_communities_banned_users_create_banned_user(
      otherModeratorConnection,
      { params: { communityId: typia.random<string & tags.Format<"uuid">>() } },
    );
  typia.assert(bannedUserForUnauthorized);
  // Now attempt to delete banned user record by unauthorized connection
  await TestValidator.httpError(
    "forbidden deletion by non-moderator",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.communities.banned_users.erase(
        unauthorizedConnection,
        {
          communityId: bannedUserForUnauthorized.community.id,
          banId: bannedUserForUnauthorized.id,
        },
      );
    },
  );
}
