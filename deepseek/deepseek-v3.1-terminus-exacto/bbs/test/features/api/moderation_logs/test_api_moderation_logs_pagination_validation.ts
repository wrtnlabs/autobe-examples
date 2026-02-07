import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationLog";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_moderation_logs_pagination_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test different pagination limits
  const limits = [1, 10, 50] as const;
  for (const limit of limits) {
    // Test first page
    const firstPage =
      await api.functional.discussionBoard.superAdmin.content_moderation_logs.index(
        superAdminConnection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies IDiscussionBoardContentModerationLog.IRequest,
        },
      );
    typia.assert(firstPage);
    // Validate pagination metadata
    TestValidator.equals(
      "current page should be 1",
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      "limit should match request",
      firstPage.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "records should be non-negative",
      firstPage.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages should be non-negative",
      firstPage.pagination.pages >= 0,
    );
    // Test page calculation (handle division by zero)
    const expectedPages =
      firstPage.pagination.records === 0
        ? 0
        : Math.ceil(firstPage.pagination.records / limit);
    TestValidator.equals(
      "pages calculation should match",
      firstPage.pagination.pages,
      expectedPages,
    );
    // Test data array length
    TestValidator.predicate(
      `data length should be <= limit ${limit}`,
      firstPage.data.length <= limit,
    );
    // Test chronological ordering (newest first)
    if (firstPage.data.length > 1) {
      for (let i = 1; i < firstPage.data.length; i++) {
        TestValidator.predicate(
          "logs should be in chronological order (newest first)",
          new Date(firstPage.data[i - 1].created_at) >=
            new Date(firstPage.data[i].created_at),
        );
      }
    }
    // Test beyond available pages
    if (firstPage.pagination.pages > 0) {
      const lastPage =
        await api.functional.discussionBoard.superAdmin.content_moderation_logs.index(
          superAdminConnection,
          {
            body: {
              page: firstPage.pagination.pages,
              limit: limit,
            } satisfies IDiscussionBoardContentModerationLog.IRequest,
          },
        );
      typia.assert(lastPage);
      TestValidator.equals(
        "last page should match total pages",
        lastPage.pagination.current,
        firstPage.pagination.pages,
      );
      // Test page beyond total pages
      const beyondPage =
        await api.functional.discussionBoard.superAdmin.content_moderation_logs.index(
          superAdminConnection,
          {
            body: {
              page: firstPage.pagination.pages + 1,
              limit: limit,
            } satisfies IDiscussionBoardContentModerationLog.IRequest,
          },
        );
      typia.assert(beyondPage);
      TestValidator.predicate(
        "page beyond total should return empty data",
        beyondPage.data.length === 0,
      );
    }
    // Test default limit behavior
    const defaultLimitPage =
      await api.functional.discussionBoard.superAdmin.content_moderation_logs.index(
        superAdminConnection,
        {
          body: {
            page: 1,
          } satisfies IDiscussionBoardContentModerationLog.IRequest,
        },
      );
    typia.assert(defaultLimitPage);
    TestValidator.predicate(
      "default limit should be reasonable",
      defaultLimitPage.pagination.limit > 0,
    );
  }
  // Test search with no results
  const noResults =
    await api.functional.discussionBoard.superAdmin.content_moderation_logs.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistent_search_term_that_will_not_match_anything",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(noResults);
  TestValidator.equals(
    "no results search should have zero records",
    noResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "no results search should have zero pages",
    noResults.pagination.pages,
    0,
  );
  TestValidator.equals(
    "no results search should have empty data",
    noResults.data.length,
    0,
  );
}
