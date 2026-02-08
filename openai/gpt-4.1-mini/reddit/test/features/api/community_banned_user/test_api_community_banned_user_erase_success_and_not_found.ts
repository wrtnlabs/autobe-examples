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
import { generate_random_community_platform_moderator_community_banned_users_create_community_banned_user } from "../../../generate/generate_random_community_platform_moderator_community_banned_users_create_community_banned_user";
import { prepare_random_community_platform_community_banned_user } from "../../../prepare/prepare_random_community_platform_community_banned_user";

export async function test_api_community_banned_user_erase_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of an existing community banned user record by an authorized moderator.
  // Create moderator connection and authorize join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // Create a community banned user record
  const bannedUser =
    await generate_random_community_platform_moderator_community_banned_users_create_community_banned_user(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(bannedUser);
  // Use the correct identifier property for banned user
  const bannedUserId = (bannedUser as { community_banned_user_id: string }).community_banned_user_id;
  typia.assert<string>(bannedUserId);
  // Delete the banned user record
  await api.functional.communityPlatform.moderator.community_banned_users.erase(
    moderatorConnection,
    { bannedUserId },
  );
  // Trying to delete again should throw 404 error
  await TestValidator.httpError(
    "delete non-existent banned user should return 404",
    404,
    async () =>
      await api.functional.communityPlatform.moderator.community_banned_users.erase(
        moderatorConnection,
        { bannedUserId },
      ),
  );
  // Scenario 2: Attempt to delete a non-existent banned user record
  const randomNonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete with invalid bannedUserId returns 404",
    404,
    async () =>
      await api.functional.communityPlatform.moderator.community_banned_users.erase(
        moderatorConnection,
        { bannedUserId: randomNonExistentId },
      ),
  );
}
