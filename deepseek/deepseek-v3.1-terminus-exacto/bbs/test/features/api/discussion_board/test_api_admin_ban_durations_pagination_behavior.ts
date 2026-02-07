import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanDuration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_ban_durations_pagination_behavior(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test pagination with different limit values
  const limitTests = [1, 5, 10] as const;
  for (const limit of limitTests) {
    // Test first page with specific limit
    const page1 =
      await api.functional.discussionBoard.admin.ban_durations.index(
        adminConnection,
        {
          body: {
            limit: limit,
            page: 1,
          } satisfies IDiscussionBoardBanDuration.IRequest,
        },
      );
    typia.assert(page1);
    // Validate pagination metadata
    TestValidator.equals(
      `page 1 limit ${limit} - current page`,
      page1.pagination.current,
      1,
    );
    TestValidator.equals(
      `page 1 limit ${limit} - limit`,
      page1.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `page 1 limit ${limit} - records count valid`,
      page1.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page 1 limit ${limit} - pages count valid`,
      page1.pagination.pages >= 0,
    );
    // Validate data array size does not exceed limit
    TestValidator.predicate(
      `page 1 limit ${limit} - data size <= limit`,
      page1.data.length <= limit,
    );
    // If there are multiple pages, test page navigation
    if (page1.pagination.pages > 1) {
      // Test second page
      const page2 =
        await api.functional.discussionBoard.admin.ban_durations.index(
          adminConnection,
          {
            body: {
              limit: limit,
              page: 2,
            } satisfies IDiscussionBoardBanDuration.IRequest,
          },
        );
      typia.assert(page2);
      TestValidator.equals(
        `page 2 limit ${limit} - current page`,
        page2.pagination.current,
        2,
      );
      TestValidator.equals(
        `page 2 limit ${limit} - limit`,
        page2.pagination.limit,
        limit,
      );
      TestValidator.equals(
        `page 2 limit ${limit} - total records consistent`,
        page2.pagination.records,
        page1.pagination.records,
      );
      TestValidator.equals(
        `page 2 limit ${limit} - total pages consistent`,
        page2.pagination.pages,
        page1.pagination.pages,
      );
    }
    // Test requesting a page beyond available data
    const beyondPage = page1.pagination.pages + 1;
    const emptyPage =
      await api.functional.discussionBoard.admin.ban_durations.index(
        adminConnection,
        {
          body: {
            limit: limit,
            page: beyondPage,
          } satisfies IDiscussionBoardBanDuration.IRequest,
        },
      );
    typia.assert(emptyPage);
    TestValidator.equals(
      `beyond page limit ${limit} - current page`,
      emptyPage.pagination.current,
      beyondPage,
    );
    TestValidator.equals(
      `beyond page limit ${limit} - empty data array`,
      emptyPage.data.length,
      0,
    );
    TestValidator.equals(
      `beyond page limit ${limit} - total records consistent`,
      emptyPage.pagination.records,
      page1.pagination.records,
    );
    TestValidator.equals(
      `beyond page limit ${limit} - total pages consistent`,
      emptyPage.pagination.pages,
      page1.pagination.pages,
    );
  }
  // Test default pagination (no limit/page specified)
  const defaultPage =
    await api.functional.discussionBoard.admin.ban_durations.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default pagination - valid current page",
    defaultPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default pagination - valid limit",
    defaultPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "default pagination - valid records count",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination - valid pages count",
    defaultPage.pagination.pages >= 0,
  );
}
