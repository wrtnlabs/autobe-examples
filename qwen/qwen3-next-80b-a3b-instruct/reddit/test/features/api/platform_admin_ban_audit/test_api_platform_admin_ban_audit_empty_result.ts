import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanOfMember";
import type { IRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanOfMember";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
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

export async function test_api_platform_admin_ban_audit_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminToken = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminToken);
  // 2. Use the automatically updated adminConnection for all subsequent calls
  // (headers updated internally by authorize_platform_admin_join)
  // 3. Query for bans with a non-existent community_id
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  const bansResponse =
    await api.functional.redditCommunity.platformAdmin.bans.index(
      adminConnection,
      {
        body: {
          community_id: nonExistentCommunityId,
        } satisfies IRedditCommunityBanOfMember.IRequest,
      },
    );
  typia.assert(bansResponse);
  // 4. Validate response structure and empty data
  TestValidator.equals(
    "status code is 200 OK",
    bansResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    bansResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records is 0",
    bansResponse.pagination.records,
    0,
  );
  TestValidator.equals("total pages is 0", bansResponse.pagination.pages, 0);
  TestValidator.equals("data array is empty", bansResponse.data.length, 0);
}
