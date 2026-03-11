import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnum";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_status_enum_search_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // 2. Test empty search (no filters)
  const emptySearch =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns valid pagination",
    emptySearch.pagination.records >= 0 &&
      emptySearch.pagination.pages >= 0 &&
      emptySearch.pagination.current >= 0 &&
      emptySearch.pagination.limit >= 0,
  );
  // 3. Test entity_type filter
  const entityType = "article" satisfies string;
  const entityTypeSearch =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {
          entity_type: entityType,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(entityTypeSearch);
  // Validate all returned records match the entity_type filter
  for (const record of entityTypeSearch.data) {
    TestValidator.equals(
      `record ${record.id} has correct entity_type`,
      record.entity_type,
      entityType,
    );
  }
  // 4. Test value pattern matching filter
  const valuePattern = "pend" satisfies string;
  const valueSearch =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {
          value: valuePattern,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(valueSearch);
  // Validate records contain the pattern (case-insensitive check)
  for (const record of valueSearch.data) {
    TestValidator.predicate(
      `record ${record.id} value contains pattern`,
      record.value.toLowerCase().includes(valuePattern.toLowerCase()),
    );
  }
  // 5. Test is_active filter (true)
  const activeSearch =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {
          is_active: true,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(activeSearch);
  for (const record of activeSearch.data) {
    TestValidator.equals(
      `record ${record.id} is active`,
      record.is_active,
      true,
    );
  }
  // 6. Test is_active filter (false)
  const inactiveSearch =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {
          is_active: false,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(inactiveSearch);
  for (const record of inactiveSearch.data) {
    TestValidator.equals(
      `record ${record.id} is inactive`,
      record.is_active,
      false,
    );
  }
  // 7. Test combined filters
  const combinedSearch =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {
          entity_type: "comment",
          value: "approv",
          is_active: true,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Validate all filters match
  for (const record of combinedSearch.data) {
    TestValidator.equals(
      `record ${record.id} has correct entity_type`,
      record.entity_type,
      "comment",
    );
    TestValidator.predicate(
      `record ${record.id} value contains pattern`,
      record.value.toLowerCase().includes("approv".toLowerCase()),
    );
    TestValidator.equals(
      `record ${record.id} is active`,
      record.is_active,
      true,
    );
  }
  // 8. Test pagination
  const pageSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const firstPage =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: pageSize,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page has correct page number",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page has correct limit",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "first page data size <= limit",
    firstPage.data.length <= pageSize,
  );
  // 9. Test second page if exists
  if (firstPage.pagination.pages >= 2) {
    const secondPage =
      await api.functional.discussionBoard.admin.status_enums.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: pageSize,
          } satisfies IDiscussionBoardStatusEnum.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page has correct page number",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page has correct limit",
      secondPage.pagination.limit,
      pageSize,
    );
    // Ensure different data between pages (if enough records)
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      TestValidator.notEquals(
        "first and second page have different records",
        firstPage.data[0].id,
        secondPage.data[0].id,
      );
    }
  }
  // 10. Test validation of pagination metadata
  const totalRecordsSearch =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(totalRecordsSearch);
  // Calculate expected pages based on records and limit
  const expectedPages = Math.ceil(
    totalRecordsSearch.pagination.records / pageSize,
  );
  TestValidator.equals(
    "pagination pages calculation is correct",
    firstPage.pagination.pages,
    expectedPages,
  );
}
