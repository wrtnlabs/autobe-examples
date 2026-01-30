import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserBan";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsUserBan";
import { prepare_random_community_bbs_user_ban } from "../../../prepare/prepare_random_community_bbs_user_ban";
import { generate_random_community_bbs_admin_users_bans_create } from "../../../generate/generate_random_community_bbs_admin_users_bans_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_ban_retrieval_by_user_id(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a test ban record for a specific user
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const banReason: string = RandomGenerator.paragraph({ sentences: 3 });
  const ban = await generate_random_community_bbs_admin_users_bans_create(
    adminConnection,
    {
      body: {
        userId: userId,
        reason: banReason,
      } satisfies ICommunityBbsUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // Step 3: Retrieve ban records filtered by the banned user ID
  const fetchResult: IPageICommunityBbsUserBan.ISummary =
    await api.functional.communityBbs.admin.users.bans.patch(adminConnection, {
      body: {
        banned_user_id: userId,
      } satisfies ICommunityBbsUserBan.IRequest,
    });
  typia.assert(fetchResult);
  // Step 4: Validate response contains exactly the expected ban record
  TestValidator.equals(
    "result count matches expected",
    fetchResult.data.length,
    1,
  );
  TestValidator.equals(
    "ban record belongs to correct user",
    fetchResult.data[0].bannedUserId,
    userId,
  );
  TestValidator.equals(
    "ban reason matches created record",
    fetchResult.data[0].banReason,
    banReason,
  );
  TestValidator.equals(
    "ban status is active",
    fetchResult.data[0].status,
    "active",
  );
  TestValidator.equals(
    "ban created_at matches record",
    fetchResult.data[0].createdAt,
    ban.created_at,
  );
  TestValidator.equals(
    "pagination total matches",
    fetchResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination is correct",
    fetchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default",
    fetchResult.pagination.limit,
    20,
  );
}
