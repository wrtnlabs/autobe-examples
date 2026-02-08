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

export async function test_api_community_moderator_banned_user_unban_success_and_failure_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins the platform
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {} satisfies ICommunityPlatformModerator.IJoin,
    });
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // 2. Setup: create random communityId and banned userId
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const bannedUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Moderator bans the user via the ban endpoint
  const banBody: ICommunityPlatformCommunityBannedUser.IBan = {
    user_id: bannedUserId,
    ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityBannedUser.IBan;
  const banResponse: ICommunityPlatformCommunityBannedUser =
    await api.functional.communityPlatform.moderator.communities.banned_users.ban(
      moderatorConnection,
      { communityId, body: banBody },
    );
  typia.assert(banResponse);
  const ban = banResponse as any;
  TestValidator.equals(
    "ban user id matches",
    ban.user_id,
    bannedUserId,
  );
  TestValidator.predicate(
    "ban record has banned_at",
    ban.banned_at !== null && ban.banned_at !== undefined,
  );
  TestValidator.equals(
    "ban record unbanned_at is null",
    ban.unbanned_at,
    null,
  );
  // 4. Moderator unbans the user
  const unbanBody: ICommunityPlatformCommunityBannedUser.IRequest = {
    user_id: bannedUserId,
  } satisfies ICommunityPlatformCommunityBannedUser.IRequest;
  const unbanResponse: ICommunityPlatformCommunityBannedUser =
    await api.functional.communityPlatform.moderator.communities.banned_users.unban.unbanUser(
      moderatorConnection,
      { communityId, body: unbanBody },
    );
  typia.assert(unbanResponse);
  const unban = unbanResponse as any;
  TestValidator.equals(
    "unban user id matches",
    unban.user_id,
    bannedUserId,
  );
  TestValidator.predicate(
    "unbanned_at is set",
    unban.unbanned_at !== null &&
      unban.unbanned_at !== undefined,
  );
  // 5. Attempt to unban a user not currently banned - expect error
  const notBannedUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const unbanNonBannedBody: ICommunityPlatformCommunityBannedUser.IRequest = {
    user_id: notBannedUserId,
  } satisfies ICommunityPlatformCommunityBannedUser.IRequest;
  await TestValidator.error("unban non-banned user should fail", async () => {
    await api.functional.communityPlatform.moderator.communities.banned_users.unban.unbanUser(
      moderatorConnection,
      { communityId, body: unbanNonBannedBody },
    );
  });
}
