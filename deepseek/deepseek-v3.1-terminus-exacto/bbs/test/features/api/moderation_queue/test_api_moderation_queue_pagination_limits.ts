import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentModerationQueue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_moderation_queue_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test different limit values
  const testLimits = [10, 25, 50] as const;
  for (const limit of testLimits) {
    // Test first page with current limit
    const page1 =
      await api.functional.discussionBoard.superAdmin.moderation_queue.index(
        superAdminConnection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies IDiscussionBoardContentModerationQueue.IRequest,
        },
      );
    typia.assert(page1);
    // Validate pagination metadata
    TestValidator.equals(
      `page1 limit ${limit} current page`,
      page1.pagination.current,
      1,
    );
    TestValidator.equals(
      `page1 limit ${limit} limit`,
      page1.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `page1 limit ${limit} records non-negative`,
      page1.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page1 limit ${limit} pages non-negative`,
      page1.pagination.pages >= 0,
    );
    // Test page calculation
    const expectedPages =
      page1.pagination.records > 0
        ? Math.ceil(page1.pagination.records / limit)
        : 0;
    TestValidator.equals(
      `page1 limit ${limit} pages calculation`,
      page1.pagination.pages,
      expectedPages,
    );
    // Test data length constraints
    TestValidator.predicate(
      `page1 limit ${limit} data length <= limit`,
      page1.data.length <= limit,
    );
    // Test beyond available pages (only if there are pages)
    if (page1.pagination.pages > 0) {
      const beyondPage = page1.pagination.pages + 1;
      const beyondResult =
        await api.functional.discussionBoard.superAdmin.moderation_queue.index(
          superAdminConnection,
          {
            body: {
              page: beyondPage,
              limit: limit,
            } satisfies IDiscussionBoardContentModerationQueue.IRequest,
          },
        );
      typia.assert(beyondResult);
      // Should have empty data but valid pagination
      TestValidator.equals(
        `beyond page limit ${limit} empty data`,
        beyondResult.data.length,
        0,
      );
      TestValidator.equals(
        `beyond page limit ${limit} current page`,
        beyondResult.pagination.current,
        beyondPage,
      );
      TestValidator.equals(
        `beyond page limit ${limit} limit`,
        beyondResult.pagination.limit,
        limit,
      );
      TestValidator.equals(
        `beyond page limit ${limit} records`,
        beyondResult.pagination.records,
        page1.pagination.records,
      );
      TestValidator.equals(
        `beyond page limit ${limit} pages`,
        beyondResult.pagination.pages,
        page1.pagination.pages,
      );
    }
  }
  // Test default values (no page/limit specified)
  const defaultResult =
    await api.functional.discussionBoard.superAdmin.moderation_queue.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardContentModerationQueue.IRequest,
      },
    );
  typia.assert(defaultResult);
  // Default should have valid pagination
  TestValidator.predicate(
    "default result has pagination",
    defaultResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "default result has data",
    Array.isArray(defaultResult.data),
  );
  // Test minimum page boundary (page 1)
  const minPageResult =
    await api.functional.discussionBoard.superAdmin.moderation_queue.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentModerationQueue.IRequest,
      },
    );
  typia.assert(minPageResult);
  TestValidator.equals(
    "min page current page",
    minPageResult.pagination.current,
    1,
  );
}
