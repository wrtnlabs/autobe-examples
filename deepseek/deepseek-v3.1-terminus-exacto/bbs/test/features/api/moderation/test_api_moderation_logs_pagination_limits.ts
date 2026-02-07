import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination functionality with different page sizes and limits for moderation logs.
 * An administrator should be able to retrieve moderation logs with configurable pagination
 * parameters including page numbers and limit values. The test verifies that the system
 * correctly handles pagination metadata including current page, limit per page, total
 * records, and total pages. Different limit values (within the 1-100 range) are tested
 * to ensure they produce the expected number of results per page.
 */
export async function test_api_moderation_logs_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Test different limit values within the valid range
  const limitValues = [1, 10, 50, 100] as const;
  for (const limit of limitValues) {
    // Test first page with specific limit
    const firstPage =
      await api.functional.discussionBoard.admin.moderation_logs.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: limit satisfies number as number,
          } satisfies IDiscussionBoardModerationLog.IRequest,
        },
      );
    typia.assert(firstPage);
    // Validate pagination metadata
    TestValidator.equals(
      `first page current should be 1 for limit ${limit}`,
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      `limit should match requested value ${limit}`,
      firstPage.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `total records should be non-negative for limit ${limit}`,
      firstPage.pagination.records >= 0,
    );
    TestValidator.predicate(
      `total pages should be non-negative for limit ${limit}`,
      firstPage.pagination.pages >= 0,
    );
    // Validate data array size (should not exceed limit)
    TestValidator.predicate(
      `data array size should not exceed limit ${limit}`,
      firstPage.data.length <= limit,
    );
    // Test pagination calculation
    if (firstPage.pagination.records > 0) {
      const expectedPages = Math.ceil(firstPage.pagination.records / limit);
      TestValidator.equals(
        `total pages calculation should be correct for limit ${limit}`,
        firstPage.pagination.pages,
        expectedPages,
      );
    }
    // Test second page if there are multiple pages
    if (firstPage.pagination.pages > 1) {
      const secondPage =
        await api.functional.discussionBoard.admin.moderation_logs.index(
          adminConnection,
          {
            body: {
              page: 2,
              limit: limit satisfies number as number,
            } satisfies IDiscussionBoardModerationLog.IRequest,
          },
        );
      typia.assert(secondPage);
      TestValidator.equals(
        `second page current should be 2 for limit ${limit}`,
        secondPage.pagination.current,
        2,
      );
      TestValidator.equals(
        `limit should remain consistent on second page for limit ${limit}`,
        secondPage.pagination.limit,
        limit,
      );
      TestValidator.equals(
        `total records should be consistent on second page for limit ${limit}`,
        secondPage.pagination.records,
        firstPage.pagination.records,
      );
    }
  }
  // Test edge case: page beyond total pages
  const beyondPage =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection,
      {
        body: {
          page: 999, // Very high page number
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(beyondPage);
  // Should return empty data array when page is beyond total pages
  TestValidator.equals(
    "data should be empty when page is beyond total pages",
    beyondPage.data.length,
    0,
  );
  // Test default values (page=1, limit=20)
  const defaultPage =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page should be 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    defaultPage.pagination.limit,
    20,
  );
}
