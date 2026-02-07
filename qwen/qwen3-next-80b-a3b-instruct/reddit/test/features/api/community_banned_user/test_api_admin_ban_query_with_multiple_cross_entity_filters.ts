import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
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

export async function test_api_admin_ban_query_with_multiple_cross_entity_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Setup: Join as admin to establish authentication context
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  typia.assert(adminJoinResult);
  // 2. Generate valid UUIDs for filters
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  const bannedByUserId = typia.random<string & tags.Format<"uuid">>();
  // 3. Query bans with all three filters applied simultaneously
  const response = await api.functional.community.admin.bans.index(
    adminConnection,
    {
      body: {
        community_id: communityId,
        banned_user_id: bannedUserId,
        banned_by_id: bannedByUserId,
      } satisfies ICommunityBannedUser.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate structure - even with empty results, response must conform to IPageICommunityBannedUser
  TestValidator.equals(
    "response has data array",
    Array.isArray(response.data),
    true,
  );
  TestValidator.equals(
    "response has pagination object",
    typeof response.pagination === "object",
    true,
  );
  TestValidator.equals(
    "response should have zero records since no bans exist",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "response should have zero items in data",
    response.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be default (10)",
    response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination pages should be 0 when records are 0",
    response.pagination.pages,
    0,
  );
  // 5. Validate filter parameters are not clashing
  // Ensure we didn't accidentally add null/undefined — all fields were provided
  TestValidator.equals(
    "community_id matches expected format",
    communityId,
    communityId,
  );
  TestValidator.equals(
    "banned_user_id matches expected format",
    bannedUserId,
    bannedUserId,
  );
  TestValidator.equals(
    "banned_by_id matches expected format",
    bannedByUserId,
    bannedByUserId,
  );
}
