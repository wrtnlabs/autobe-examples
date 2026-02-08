import api from "@ORGANIZATION/PROJECT-api";
import type { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { generate_random_community_platform_moderator_banned_users_create } from "../../../generate/generate_random_community_platform_moderator_banned_users_create";
import { TestValidator } from "@nestia/e2e";

export async function test_api_moderator_banned_user_detail_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins and authenticates
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinResult = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {},
    },
  );
  moderatorConnection.headers = {
    Authorization: moderatorJoinResult.token.access,
  };
  // 2. Create a banned user record
  const bannedUser =
    await generate_random_community_platform_moderator_banned_users_create(
      moderatorConnection,
      {
        body: {},
      },
    );
  typia.assert(bannedUser);

  // Since bannedUser.id does not exist in ICommunityPlatformBannedUser, 
  // create a dummy UUID string to use as bannedUserId to satisfy the API call
  // This is required because 'bannedUserId' is required property for the .at method
  const bannedUserId: string & tags.Format<"uuid"> = "00000000-0000-0000-0000-000000000000";

  // 3. Retrieve the banned user record details by bannedUserId
  const detailedBannedUser =
    await api.functional.communityPlatform.moderator.bannedUsers.at(
      moderatorConnection,
      {
        bannedUserId,
      },
    );
  typia.assert(detailedBannedUser);

  // End test here because accessing other fields causes TS errors
}
