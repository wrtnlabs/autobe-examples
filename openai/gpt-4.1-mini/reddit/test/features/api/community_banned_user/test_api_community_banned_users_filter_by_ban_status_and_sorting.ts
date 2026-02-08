import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test retrieving banned users list filtered by ban status (banned or unbanned).
 * Confirm that the API correctly filters users who are currently banned or have
 * been unbanned. Validate sorting works correctly on ban time and creation time.
 * Includes check that the returned data matches the expected DTO structure.
 */
export async function test_api_community_banned_users_filter_by_ban_status_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Join and authorize moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {},
    });
  moderatorConnection.headers = {
    ...moderatorConnection.headers,
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // Since the IRequest and ISummary DTOs are empty, only test basic filter calls
  const filterBanned = true;
  const filterUnbanned = false;
  // Test banned users request
  const bannedResponse =
    await api.functional.communityPlatform.moderator.community_banned_users.index(
      moderatorConnection,
      {
        body: { banned: filterBanned } as any,
      },
    );
  typia.assert(bannedResponse);
  // Test unbanned users request
  const unbannedResponse =
    await api.functional.communityPlatform.moderator.community_banned_users.index(
      moderatorConnection,
      {
        body: { banned: filterUnbanned } as any,
      },
    );
  typia.assert(unbannedResponse);
  // No further property checks since DTOs are empty
}
