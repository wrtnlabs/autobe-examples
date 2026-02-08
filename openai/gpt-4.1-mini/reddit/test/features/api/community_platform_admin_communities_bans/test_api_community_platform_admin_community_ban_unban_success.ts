import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_platform_admin_community_ban_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and obtains authorization token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Prepare UUIDs for communityId and bannedUserId
  // For testing, generate random UUID strings
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the unban endpoint using utility function
  const banRecord =
    await api.functional.communityPlatform.admin.communities.bans.unban(
      adminConnection,
      {
        communityId: communityId,
        bannedUserId: bannedUserId,
      },
    );
  // 4. Assert response shape and validity
  typia.assert(banRecord);
  // 5. Conceptual step (no API to call): Validate banned user can now post/comment
  // (This would be done by attempting post/comment with bannedUserConnection or checking permissions.)
}
