import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_analytics_flags_pagination_limits(
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
  // Test various limit values
  const limitTests = [1, 10, 50, 100] as const;
  for (const limit of limitTests) {
    // Test first page
    const firstPage =
      await api.functional.discussionBoard.superAdmin.analytics.flags.index(
        superAdminConnection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies IDiscussionBoardContentFlag.IRequest,
        },
      );
    typia.assert(firstPage);
    // Validate pagination metadata
    TestValidator.equals(
      `limit ${limit} - current page`,
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      `limit ${limit} - page limit`,
      firstPage.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `limit ${limit} - records count non-negative`,
      firstPage.pagination.records >= 0,
    );
    TestValidator.predicate(
      `limit ${limit} - pages count non-negative`,
      firstPage.pagination.pages >= 0,
    );
    // Validate data array size does not exceed limit
    TestValidator.predicate(
      `limit ${limit} - data size <= limit`,
      firstPage.data.length <= limit,
    );
    // Test page navigation if multiple pages exist
    if (firstPage.pagination.pages > 1) {
      const secondPage =
        await api.functional.discussionBoard.superAdmin.analytics.flags.index(
          superAdminConnection,
          {
            body: {
              page: 2,
              limit: limit,
            } satisfies IDiscussionBoardContentFlag.IRequest,
          },
        );
      typia.assert(secondPage);
      TestValidator.equals(
        `limit ${limit} - second page current`,
        secondPage.pagination.current,
        2,
      );
      TestValidator.equals(
        `limit ${limit} - second page limit`,
        secondPage.pagination.limit,
        limit,
      );
      TestValidator.equals(
        `limit ${limit} - total records consistent`,
        secondPage.pagination.records,
        firstPage.pagination.records,
      );
      TestValidator.equals(
        `limit ${limit} - total pages consistent`,
        secondPage.pagination.pages,
        firstPage.pagination.pages,
      );
    }
    // Test last page
    if (firstPage.pagination.pages > 0) {
      const lastPage =
        await api.functional.discussionBoard.superAdmin.analytics.flags.index(
          superAdminConnection,
          {
            body: {
              page: firstPage.pagination.pages,
              limit: limit,
            } satisfies IDiscussionBoardContentFlag.IRequest,
          },
        );
      typia.assert(lastPage);
      TestValidator.equals(
        `limit ${limit} - last page current`,
        lastPage.pagination.current,
        firstPage.pagination.pages,
      );
      TestValidator.predicate(
        `limit ${limit} - last page data size <= limit`,
        lastPage.data.length <= limit,
      );
      TestValidator.predicate(
        `limit ${limit} - last page has remaining records`,
        lastPage.data.length > 0 || firstPage.pagination.records === 0,
      );
    }
    // Test out-of-bounds page (page beyond total pages)
    if (firstPage.pagination.pages > 0) {
      const outOfBoundsPage =
        await api.functional.discussionBoard.superAdmin.analytics.flags.index(
          superAdminConnection,
          {
            body: {
              page: firstPage.pagination.pages + 1,
              limit: limit,
            } satisfies IDiscussionBoardContentFlag.IRequest,
          },
        );
      typia.assert(outOfBoundsPage);
      // Should return empty data array for out-of-bounds page
      TestValidator.equals(
        `limit ${limit} - out-of-bounds page empty data`,
        outOfBoundsPage.data.length,
        0,
      );
      TestValidator.equals(
        `limit ${limit} - out-of-bounds page current`,
        outOfBoundsPage.pagination.current,
        firstPage.pagination.pages + 1,
      );
    }
  }
}
