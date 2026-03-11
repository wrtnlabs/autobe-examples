import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_audit_logs_pagination_and_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: First page with different limit sizes
  const limitSizes = [1, 10, 50, 100] as const;
  for (const limit of limitSizes) {
    const response =
      await api.functional.discussionBoard.superAdmin.audit_logs.index(
        superAdminConnection,
        {
          body: {
            page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
            limit: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >(),
          } satisfies IDiscussionBoardAuditLog.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      `page 1 with limit ${limit} - current page`,
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      `page 1 with limit ${limit} - limit`,
      response.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `page 1 with limit ${limit} - records non-negative`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page 1 with limit ${limit} - pages non-negative`,
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      `page 1 with limit ${limit} - data length <= limit`,
      response.data.length <= limit,
    );
  }
  // Test 2: Middle page navigation
  const middlePageResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<2>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(middlePageResponse);
  if (middlePageResponse.pagination.pages > 1) {
    TestValidator.equals(
      "middle page - current page",
      middlePageResponse.pagination.current,
      2,
    );
    TestValidator.predicate(
      "middle page - valid data length",
      middlePageResponse.data.length <= 10,
    );
  }
  // Test 3: Last page access
  const totalPages = middlePageResponse.pagination.pages;
  if (totalPages > 0) {
    const lastPageResponse =
      await api.functional.discussionBoard.superAdmin.audit_logs.index(
        superAdminConnection,
        {
          body: {
            page: totalPages satisfies number as number,
            limit: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
            >(),
          } satisfies IDiscussionBoardAuditLog.IRequest,
        },
      );
    typia.assert(lastPageResponse);
    TestValidator.equals(
      "last page - current page",
      lastPageResponse.pagination.current,
      totalPages,
    );
    TestValidator.predicate(
      "last page - data length valid",
      lastPageResponse.data.length <= 10,
    );
  }
  // Test 4: Edge cases - page 0 (should default to 1)
  const pageZeroResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 0 satisfies number as number,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(pageZeroResponse);
  TestValidator.equals(
    "page 0 defaults to page 1",
    pageZeroResponse.pagination.current,
    1,
  );
  // Test 5: Edge cases - limit exceeding maximum (should cap at 100)
  const largeLimitResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: 150 satisfies number as number,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(largeLimitResponse);
  TestValidator.equals(
    "limit 150 caps at 100",
    largeLimitResponse.pagination.limit,
    100,
  );
  // Test 6: Empty result set with specific filters
  const emptyResultResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          actorType: "system" as const,
          actionType: "nonexistent_action",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(emptyResultResponse);
  TestValidator.equals(
    "empty result - current page",
    emptyResultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result - limit",
    emptyResultResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty result - total records",
    emptyResultResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result - total pages",
    emptyResultResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result - data array empty",
    emptyResultResponse.data.length,
    0,
  );
  // Test 7: Verify pagination metadata calculations
  const testResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<25>
          >(),
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(testResponse);
  const expectedPages = Math.ceil(
    testResponse.pagination.records / testResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination calculation - total pages",
    testResponse.pagination.pages,
    expectedPages,
  );
  TestValidator.predicate(
    "pagination calculation - data length valid",
    testResponse.data.length <= testResponse.pagination.limit,
  );
}
