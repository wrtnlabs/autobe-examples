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

export async function test_api_admin_bans_text_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Create multiple ban records with varied reasons using utility function
  const keywords = [
    "spam",
    "harassment",
    "violation",
    "inappropriate",
    "abuse",
  ] as const;
  const banReasons: string[] = [];
  // Create 15 ban records with varied reasons
  for (let i = 0; i < 15; i++) {
    const keyword = RandomGenerator.pick(keywords);
    const reason = `User engaged in ${keyword} activities ${i + 1}. This is a test ban record for ${keyword} testing.`;
    banReasons.push(reason);
    await generate_random_discussion_board_admin_bans_create(adminConnection, {
      body: {
        banReason: reason satisfies string & tags.MinLength<10>,
        banDurationType: "temporary" as const,
        banDurationDays: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
        >(),
      },
    });
  }
  // Test 1: Search for 'spam' keyword with default pagination
  const search1 = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "spam",
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(search1);
  // Validate pagination metadata
  await TestValidator.predicate(
    "page 1 has correct limit",
    async () => search1.pagination.pagination.limit === 5,
  );
  await TestValidator.predicate(
    "page 1 current page is 1",
    async () => search1.pagination.pagination.current === 1,
  );
  await TestValidator.predicate(
    "total records count reasonable",
    async () => search1.pagination.pagination.records >= 0,
  );
  await TestValidator.predicate(
    "has correct pages calculation",
    async () => search1.pagination.pagination.pages >= 1,
  );
  // Validate search results contain 'spam' in banReason (case-insensitive)
  for (const record of search1.data) {
    await TestValidator.predicate(
      `ban reason contains search term 'spam'`,
      async () => record.banReason.toLowerCase().includes("spam"),
    );
  }
  // Test 2: Search for 'violation' with different page size
  const search2 = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "violation",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(search2);
  await TestValidator.predicate(
    "page size is 10",
    async () => search2.pagination.pagination.limit === 10,
  );
  await TestValidator.predicate(
    "data length does not exceed limit",
    async () => search2.data.length <= 10,
  );
  // Test 3: Empty search results for non-existing term
  const search3 = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "nonexistentterm12345",
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(search3);
  await TestValidator.predicate(
    "empty search returns empty data",
    async () => search3.data.length === 0,
  );
  await TestValidator.predicate(
    "total records is 0 for non-existent term",
    async () => search3.pagination.pagination.records === 0,
  );
  await TestValidator.predicate(
    "pages is 0 for empty results",
    async () => search3.pagination.pagination.pages === 0,
  );
  // Test 4: Pagination boundary - second page
  const search4 = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "harassment",
        page: 2,
        limit: 3,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(search4);
  await TestValidator.predicate(
    "page 2 current page is 2",
    async () => search4.pagination.pagination.current === 2,
  );
  // Test 5: No search term (should return all records with pagination)
  const search5 = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: undefined,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(search5);
  await TestValidator.predicate(
    "no search returns all records",
    async () => search5.pagination.pagination.records >= 15,
  );
}
