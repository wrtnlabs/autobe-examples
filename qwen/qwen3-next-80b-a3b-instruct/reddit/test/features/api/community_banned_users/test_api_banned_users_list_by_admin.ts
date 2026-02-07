import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_moderator_bans_create } from "../../../generate/generate_random_community_moderator_bans_create";
import { prepare_random_community_banned_user } from "../../../prepare/prepare_random_community_banned_user";

export async function test_api_banned_users_list_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup: Create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  typia.assert(adminJoin);
  // Use the adminConnection already authenticated by authorize_admin_join (it sets Authorization header)
  const adminAuthConnection = adminConnection;
  // 2. Generate 25 banned user records across the target community
  // Use a generated UUID for communityId (since we cannot create a community)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Authenticate as a moderator to create bans
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = await authorize_moderator_join(moderatorConnection, {
    body: typia.random<ICommunityModerator.IJoin>(),
  });
  typia.assert(moderatorJoin);
  // Use the moderatorConnection already authenticated by authorize_moderator_join
  const moderatorAuthConnection = moderatorConnection;
  // Generate 25 bans using the utility function
  // ICommunityBannedUser.ICreate is empty interface {} per definition, so body must be {}.
  void await ArrayUtil.repeat(25, async () => {
    await generate_random_community_moderator_bans_create(
      moderatorAuthConnection,
      {
        body: {} satisfies ICommunityBannedUser.ICreate,
      },
    );
  });
  // 3. Admin fetches the banned users list for the community
  const result =
    await api.functional.community.admin.communities.banned_users.index(
      adminAuthConnection,
      {
        communityId,
        body: {} satisfies ICommunityBannedUser.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate the response structure according to actual DTO definitions
  // ICommunityBannedUser.ISummary is an empty interface ({}), so we cannot validate any properties on its items.
  // We only validate the pagination structure and array length.
  // Check pagination: 25 records, limit 20 => 2 pages
  TestValidator.equals("total records", result.pagination.records, 25);
  TestValidator.equals("limit per page", result.pagination.limit, 20);
  TestValidator.equals("total pages", result.pagination.pages, 2);
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("data array length", result.data.length, 20);
  // Since ICommunityBannedUser.ISummary has no defined properties (empty interface),
  // we cannot validate display_name, avatar_url, reason, created_at, expires_at, or banned_by_display_name.
  // Per rule: "Test what EXISTS, not what SHOULD exist". The DTO defines it as {}.
  // Therefore, no further validation of summary properties is performed.
}