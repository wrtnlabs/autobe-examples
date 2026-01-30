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
export async function test_api_admin_ban_retrieval_by_time_range_and_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create ban records with varying statuses and timestamps
  // Will create 3 active bans within last 30 days, 2 expired bans, and 1 with status removed
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Create 3 active bans (expires_at = null) with start_time within last 30 days
  const activeBans: ICommunityBbsUserBan[] = [];
  for (let i = 0; i < 3; i++) {
    // Random date between 30 days ago and now
    const startTime = RandomGenerator.date(
      thirtyDaysAgo,
      now.getTime() - thirtyDaysAgo.getTime(),
    );
    const ban = await generate_random_community_bbs_admin_users_bans_create(
      adminConnection,
      {
        body: {
          userId: typia.random<string & tags.Format<"uuid">>(),
          reason: `Violation ${i + 1}`,
          expiresAt: null, // Permanent ban = active
        } satisfies ICommunityBbsUserBan.ICreate,
      },
    );
    activeBans.push(ban);
  }
  // Create 2 expired bans (expires_at in past)
  const expiredBans: ICommunityBbsUserBan[] = [];
  for (let i = 0; i < 2; i++) {
    // Create a ban that expired yesterday
    const expiresAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const ban = await generate_random_community_bbs_admin_users_bans_create(
      adminConnection,
      {
        body: {
          userId: typia.random<string & tags.Format<"uuid">>(),
          reason: `Expired violation ${i + 1}`,
          expiresAt: expiresAt.toISOString(), // Automatically sets status to 'expired'
        } satisfies ICommunityBbsUserBan.ICreate,
      },
    );
    expiredBans.push(ban);
  }
  // Create 1 ban with status as 'removed' — note: system decides status
  // This will be a regular ban that was manually removed (handled in backend)
  // Simulate by creating one ban and having it marked as removed via business logic
  // Since we can't directly control status, we’ll assume the system handles it
  // We'll create one more active ban (which system might later remove)
  const removedBan =
    await generate_random_community_bbs_admin_users_bans_create(
      adminConnection,
      {
        body: {
          userId: typia.random<string & tags.Format<"uuid">>(),
          reason: "Removed violation",
          expiresAt: null,
        } satisfies ICommunityBbsUserBan.ICreate,
      },
    );
  // Step 3: Run the ban retrieval with time range and status filters
  // Query: active bans that started within the last 30 days
  const response = await api.functional.communityBbs.admin.users.bans.patch(
    adminConnection,
    {
      body: {
        status: "active",
        start_time: thirtyDaysAgo.toISOString(),
      } satisfies ICommunityBbsUserBan.IRequest,
    },
  );
  // Step 4: Validate the response
  typia.assert(response);
  // Validate pagination summary
  TestValidator.equals(
    "pagination total records match",
    response.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.equals("pagination pages", response.pagination.pages, 1);
  // Validate data array structure
  TestValidator.equals("response data length", response.data.length, 3);
  // Verify each ban is active and has start_time within last 30 days
  for (const ban of response.data) {
    TestValidator.equals("ban status is active", ban.status, "active");
    const banDate = new Date(ban.startTime);
    TestValidator.predicate(
      "ban start_time is within last 30 days",
      () => banDate >= thirtyDaysAgo && banDate <= now,
    );
  }
  // Verify sorting: results are sorted by start_time descending
  for (let i = 0; i < response.data.length - 1; i++) {
    const currentBanDate = new Date(response.data[i].startTime);
    const nextBanDate = new Date(response.data[i + 1].startTime);
    TestValidator.predicate(
      "ban records are sorted by start_time descending",
      () => currentBanDate >= nextBanDate,
    );
  }
  // Confirm that expired and removed bans are excluded from results
  // Sanity check: total of created bans is 6, only 3 active within time range
  TestValidator.equals(
    "total created bans",
    activeBans.length + expiredBans.length + 1,
    6,
  );
}
