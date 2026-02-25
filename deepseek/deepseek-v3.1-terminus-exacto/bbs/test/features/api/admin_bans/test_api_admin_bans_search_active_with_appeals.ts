import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_admin_bans_search_active_with_appeals(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as administrator
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create test ban records with different statuses
  // Active ban with pending appeal
  const activeBanWithPendingAppeal =
    await generate_random_discussion_board_admin_bans_create(adminConnection, {
      body: {
        bannedUserId: typia.random<string & tags.Format<"uuid">>(),
        banReason: RandomGenerator.paragraph({
          sentences: 3,
        }) satisfies string & tags.MinLength<10> as string,
        banDurationType: "temporary" as const,
        banDurationDays: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
        >(),
      } satisfies IDiscussionBoardBanRecord.ICreate,
    });
  typia.assert(activeBanWithPendingAppeal);
  // Active ban with no appeal
  const activeBanWithNoAppeal =
    await generate_random_discussion_board_admin_bans_create(adminConnection, {
      body: {
        bannedUserId: typia.random<string & tags.Format<"uuid">>(),
        banReason: RandomGenerator.paragraph({
          sentences: 3,
        }) satisfies string & tags.MinLength<10> as string,
        banDurationType: "permanent" as const,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    });
  typia.assert(activeBanWithNoAppeal);
  // Expired ban
  const expiredBan = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        bannedUserId: typia.random<string & tags.Format<"uuid">>(),
        banReason: RandomGenerator.paragraph({
          sentences: 3,
        }) satisfies string & tags.MinLength<10> as string,
        banDurationType: "temporary" as const,
        banDurationDays: 1, // Short duration to simulate expired ban
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(expiredBan);
  // Search for active bans with pending appeals
  const searchResult = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        banStatus: "active" as const,
        appealStatus: "pending" as const,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate pagination metadata - using correct nested structure
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    searchResult.pagination.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count",
    searchResult.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count",
    searchResult.pagination.pagination.pages >= 0,
  );
  // Validate that only active bans with pending appeals are returned
  for (const ban of searchResult.data) {
    TestValidator.equals("ban status is active", ban.banStatus, "active");
    TestValidator.equals(
      "appeal status is pending",
      ban.appealStatus,
      "pending",
    );
    TestValidator.predicate(
      "ban has banned user",
      ban.bannedUser.id !== undefined,
    );
    TestValidator.predicate(
      "ban has banning administrator",
      ban.banningAdministrator.id !== undefined,
    );
  }
  // Additional validation: Ensure the search correctly filters
  TestValidator.predicate(
    "search returns appropriate number of records",
    searchResult.data.length <= searchResult.pagination.pagination.records,
  );
}
