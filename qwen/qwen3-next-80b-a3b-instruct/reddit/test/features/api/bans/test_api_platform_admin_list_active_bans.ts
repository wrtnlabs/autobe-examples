import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanOfMember";
import type { IRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanOfMember";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_list_active_bans(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform admin
  const adminConnection: api.IConnection = {
    host: connection.host,
  } satisfies api.IConnection;
  const admin = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  // 2. Make API call to list active bans with pagination
  // According to scenario: fetch first 10 results, sorted by creation time descending
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const bans =
    await api.functional.redditCommunity.platformAdmin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          deleted_at: null, // active bans only
        } satisfies IRedditCommunityBanOfMember.IRequest,
      },
    );
  typia.assert(bans);
  // 3. Validate pagination structure
  TestValidator.equals("pagination current", bans.pagination.current, 1);
  TestValidator.equals("pagination limit", bans.pagination.limit, 10);
  TestValidator.predicate("at least one active ban", bans.data.length >= 1);
  // 4. Validate each ban record structure
  for (const ban of bans.data) {
    TestValidator.equals("ban ID is UUID", typeof ban.id, "string");
    TestValidator.equals("reason is string", typeof ban.reason, "string");
    // Validate banned user structure
    TestValidator.equals(
      "bannedUser.id type",
      typeof ban.bannedUser.id,
      "string",
    );
    TestValidator.equals(
      "bannedUser.displayName type",
      typeof ban.bannedUser.display_name,
      "string",
    );
    // Validate moderator structure
    TestValidator.equals(
      "moderator.id type",
      typeof ban.moderator.id,
      "string",
    );
    TestValidator.equals(
      "moderator.displayName type",
      typeof ban.moderator.display_name,
      "string",
    );
  }
}
