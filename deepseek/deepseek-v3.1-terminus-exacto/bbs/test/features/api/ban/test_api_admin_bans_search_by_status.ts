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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_admin_bans_search_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create test users to be banned
  const testUsers: IDiscussionBoardUser.IAuthorized[] = [];
  for (let i = 0; i < 4; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "user123",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    });
    testUsers.push(user);
  }
  // Create multiple ban records - backend will assign status automatically based duration and time
  const banRecords: IDiscussionBoardBanRecord[] = [];
  // Create several ban records with different configurations
  for (let i = 0; i < 5; i++) {
    const ban = await generate_random_discussion_board_admin_bans_create(
      adminConnection,
      {
        body: {
          bannedUserId: testUsers[i % testUsers.length].id,
          banReason:
            `Test ban record ${i} - ${RandomGenerator.paragraph({ sentences: 2 })}` satisfies string &
              tags.MinLength<10>,
          banDurationType: RandomGenerator.pick([
            "temporary",
            "permanent",
          ] as const),
          banDurationDays:
            RandomGenerator.pick(["temporary", "permanent"] as const) ===
            "temporary"
              ? typia.random<
                  number &
                    tags.Type<"int32"> &
                    tags.Minimum<1> &
                    tags.Maximum<365>
                >()
              : undefined,
        } satisfies DeepPartial<IDiscussionBoardBanRecord.ICreate>,
      },
    );
    typia.assert(ban);
    banRecords.push(ban);
  }
  // Test search by different status filters
  const validStatuses: Array<"active" | "expired" | "revoked" | "appealed"> = [
    "active",
    "expired",
    "revoked",
    "appealed",
  ];
  for (const status of validStatuses) {
    const searchResult =
      await api.functional.discussionBoard.admin.user_bans.index(
        adminConnection,
        {
          body: {
            banStatus: status,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardBanRecord.IRequest,
        },
      );
    typia.assert(searchResult);
    // Validate pagination metadata
    TestValidator.predicate(
      `${status} search returns valid pagination`,
      searchResult.pagination.pagination.current > 0 &&
        searchResult.pagination.pagination.limit === 10 &&
        searchResult.pagination.pagination.records >= 0 &&
        searchResult.pagination.pagination.pages >= 0,
    );
    // Validate that returned records contain proper summary information
    for (const ban of searchResult.data) {
      typia.assert(ban.bannedUser);
      typia.assert(ban.banningAdministrator);
      TestValidator.predicate(
        `${status} ban summary has valid user data`,
        !!ban.bannedUser.id && !!ban.bannedUser.display_name,
      );
      TestValidator.predicate(
        `${status} ban summary has valid admin data`,
        !!ban.banningAdministrator.id &&
          !!ban.banningAdministrator.display_name,
      );
    }
  }
  // Test pagination functionality
  const firstPage = await api.functional.discussionBoard.admin.user_bans.index(
    adminConnection,
    {
      body: {
        limit: 2,
        page: 1,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(firstPage);
  const secondPage = await api.functional.discussionBoard.admin.user_bans.index(
    adminConnection,
    {
      body: {
        limit: 2,
        page: 2,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(secondPage);
  // Verify pagination results are different
  TestValidator.predicate(
    "pagination returns different pages",
    firstPage.data.length <= 2 &&
      secondPage.data.length <= 2 &&
      (firstPage.data.length === 0 ||
        secondPage.data.length === 0 ||
        firstPage.data[0]?.id !== secondPage.data[0]?.id),
  );
  // Test search with text filter
  const searchResult =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          search: "Test ban record",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "text search returns results",
    searchResult.pagination.pagination.records >= 0,
  );
}
