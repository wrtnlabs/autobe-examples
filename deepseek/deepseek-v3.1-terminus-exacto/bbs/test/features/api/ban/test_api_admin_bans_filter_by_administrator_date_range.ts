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

export async function test_api_admin_bans_filter_by_administrator_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create two different administrator accounts with proper connections
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);
  // Create bans using respective admin connections
  const admin1Ban1 = await generate_random_discussion_board_admin_bans_create(
    admin1Connection,
    {
      body: {
        bannedUserId: typia.random<string & tags.Format<"uuid">>(),
        banReason: RandomGenerator.paragraph({
          sentences: 3,
        }) satisfies string & tags.MinLength<10>,
        banDurationType: "temporary",
        banDurationDays: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
        >(),
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(admin1Ban1);
  const admin1Ban2 = await generate_random_discussion_board_admin_bans_create(
    admin1Connection,
    {
      body: {
        bannedUserId: typia.random<string & tags.Format<"uuid">>(),
        banReason: RandomGenerator.paragraph({
          sentences: 3,
        }) satisfies string & tags.MinLength<10>,
        banDurationType: "temporary",
        banDurationDays: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
        >(),
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(admin1Ban2);
  const admin2Ban1 = await generate_random_discussion_board_admin_bans_create(
    admin2Connection,
    {
      body: {
        bannedUserId: typia.random<string & tags.Format<"uuid">>(),
        banReason: RandomGenerator.paragraph({
          sentences: 3,
        }) satisfies string & tags.MinLength<10>,
        banDurationType: "permanent",
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(admin2Ban1);
  const admin2Ban2 = await generate_random_discussion_board_admin_bans_create(
    admin2Connection,
    {
      body: {
        bannedUserId: typia.random<string & tags.Format<"uuid">>(),
        banReason: RandomGenerator.paragraph({
          sentences: 3,
        }) satisfies string & tags.MinLength<10>,
        banDurationType: "temporary",
        banDurationDays: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
        >(),
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(admin2Ban2);
  // Wait a moment to ensure timestamps are different
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Create current timestamp for date range filtering
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  // Test combined filter: admin1 with current date range
  const combinedFilterResult =
    await api.functional.discussionBoard.admin.bans.index(admin1Connection, {
      body: {
        banningAdministratorId: admin1.id,
        banStartedAtFrom: oneHourAgo,
        banStartedAtTo: oneHourFromNow,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    });
  typia.assert(combinedFilterResult);
  // Verify combined filter results
  TestValidator.predicate(
    "combined filter should return bans from admin1 within date range",
    combinedFilterResult.data.length >= 1,
  );
  if (combinedFilterResult.data.length > 0) {
    TestValidator.predicate(
      "all returned bans should be from admin1",
      combinedFilterResult.data.every(
        (ban) => ban.banningAdministrator.id === admin1.id,
      ),
    );
  }
  // Test empty result set: non-existing admin with date range
  const nonExistingAdminId = typia.random<string & tags.Format<"uuid">>();
  const emptyFilterResult =
    await api.functional.discussionBoard.admin.bans.index(admin1Connection, {
      body: {
        banningAdministratorId: nonExistingAdminId,
        banStartedAtFrom: oneHourAgo,
        banStartedAtTo: oneHourFromNow,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    });
  typia.assert(emptyFilterResult);
  TestValidator.equals(
    "non-existing admin filter should return empty result",
    emptyFilterResult.data.length,
    0,
  );
  // Test admin2 filtering with date range
  const admin2FilterResult =
    await api.functional.discussionBoard.admin.bans.index(admin2Connection, {
      body: {
        banningAdministratorId: admin2.id,
        banStartedAtFrom: oneHourAgo,
        banStartedAtTo: oneHourFromNow,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    });
  typia.assert(admin2FilterResult);
  TestValidator.predicate(
    "admin2 filter should return bans from admin2",
    admin2FilterResult.data.length >= 1,
  );
  // Test pagination with combined filters
  const paginationResult =
    await api.functional.discussionBoard.admin.bans.index(admin1Connection, {
      body: {
        banningAdministratorId: admin1.id,
        banStartedAtFrom: oneHourAgo,
        banStartedAtTo: oneHourFromNow,
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    });
  typia.assert(paginationResult);
  TestValidator.predicate(
    "pagination should respect limit parameter",
    paginationResult.data.length <= 1,
  );
  // Test edge case: date range in the future (should return empty)
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const futureFilterResult =
    await api.functional.discussionBoard.admin.bans.index(admin1Connection, {
      body: {
        banningAdministratorId: admin1.id,
        banStartedAtFrom: futureDate,
        banStartedAtTo: oneHourFromNow,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    });
  typia.assert(futureFilterResult);
  TestValidator.equals(
    "future date range should return empty result",
    futureFilterResult.data.length,
    0,
  );
}
