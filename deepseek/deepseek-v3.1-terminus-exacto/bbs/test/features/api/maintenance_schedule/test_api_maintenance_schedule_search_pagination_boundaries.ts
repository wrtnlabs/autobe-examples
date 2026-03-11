import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMaintenanceSchedule";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination behavior at various boundaries including the first page, last page,
 * page sizes at minimum and maximum limits, and requests beyond the available page count.
 * Validate that the pagination metadata correctly reflects the current position and
 * total record count. Test edge cases such as page numbers beyond available pages,
 * and limit values at the boundaries of 1 and 100. Ensure the response maintains
 * consistent structure across different pagination scenarios.
 */
export async function test_api_maintenance_schedule_search_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Test minimum limit (1) with page 1
  const minLimitResponse =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "min limit set to 1",
    minLimitResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "min limit current page valid",
    minLimitResponse.pagination.current >= 1,
  );
  // 3. Test maximum limit (100) with page 1
  const maxLimitResponse =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit set to 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit current page valid",
    maxLimitResponse.pagination.current >= 1,
  );
  // 4. Test page beyond available pages (page 999999)
  const beyondPageResponse =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          page: 999999,
          limit: 10,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(beyondPageResponse);
  TestValidator.predicate(
    "beyond page handled gracefully",
    beyondPageResponse.pagination.current <=
      beyondPageResponse.pagination.pages,
  );
  // 5. Test first page (page 1) with default limit
  const firstPageResponse =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          page: 1,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  TestValidator.equals(
    "first page current",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "first page limit reasonable",
    firstPageResponse.pagination.limit >= 1 &&
      firstPageResponse.pagination.limit <= 100,
  );
  // 6. Test last page calculation
  if (firstPageResponse.pagination.pages > 0) {
    const lastPageResponse =
      await api.functional.discussionBoard.admin.maintenance_schedules.index(
        adminConnection,
        {
          body: {
            page: firstPageResponse.pagination.pages,
            limit: firstPageResponse.pagination.limit,
          } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
        },
      );
    typia.assert(lastPageResponse);
    TestValidator.equals(
      "last page current",
      lastPageResponse.pagination.current,
      firstPageResponse.pagination.pages,
    );
    TestValidator.predicate(
      "last page data length reasonable",
      lastPageResponse.data.length <= lastPageResponse.pagination.limit,
    );
  }
  // 7. Validate pagination consistency
  const responses = [
    minLimitResponse,
    maxLimitResponse,
    beyondPageResponse,
    firstPageResponse,
  ];
  for (const response of responses) {
    TestValidator.predicate(
      "current page non-negative",
      response.pagination.current >= 0,
    );
    TestValidator.predicate("limit positive", response.pagination.limit > 0);
    TestValidator.predicate(
      "records non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages non-negative",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate("data array present", Array.isArray(response.data));
  }
}
