import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanReasonCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination behavior and limit enforcement for ban reason categories search.
 * This scenario validates that the system correctly handles pagination parameters including
 * page numbers, limit constraints (1-100), and calculates total pages accurately.
 * Verify that requesting page numbers beyond available data returns empty results with
 * proper pagination metadata. Test edge cases such as minimum/maximum limit values,
 * page boundaries, and ensure the system maintains consistent behavior across different
 * page requests. Validate that the pagination metadata correctly reflects the filtered
 * dataset size and that soft-deleted records are excluded from count calculations.
 */
export async function test_api_admin_ban_reason_categories_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
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
  // Test minimum limit (1)
  const minLimitResponse =
    await api.functional.discussionBoard.admin.ban_reason_categories.index(
      adminConnection,
      {
        body: {
          limit: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "minimum limit validation",
    minLimitResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "limit is at least 1",
    minLimitResponse.pagination.limit >= 1,
  );
  // Test maximum limit (100)
  const maxLimitResponse =
    await api.functional.discussionBoard.admin.ban_reason_categories.index(
      adminConnection,
      {
        body: {
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit validation",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "limit is at most 100",
    maxLimitResponse.pagination.limit <= 100,
  );
  // Test pagination metadata consistency
  const firstPageResponse =
    await api.functional.discussionBoard.admin.ban_reason_categories.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  // Validate pagination metadata
  TestValidator.equals("current page", firstPageResponse.pagination.current, 1);
  TestValidator.predicate(
    "records count non-negative",
    firstPageResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    firstPageResponse.pagination.pages >= 0,
  );
  // Test page beyond available data
  const highPageResponse =
    await api.functional.discussionBoard.admin.ban_reason_categories.index(
      adminConnection,
      {
        body: {
          page: 9999 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(highPageResponse);
  // Empty data array expected for page beyond available content
  TestValidator.equals(
    "empty data for high page",
    highPageResponse.data.length,
    0,
  );
  // Validate pagination calculation
  const totalRecords = firstPageResponse.pagination.records;
  const limit = firstPageResponse.pagination.limit;
  const expectedPages = Math.ceil(totalRecords / limit);
  TestValidator.equals(
    "pages calculation",
    firstPageResponse.pagination.pages,
    expectedPages,
  );
}
