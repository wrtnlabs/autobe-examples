import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test retrieving snapshots for a section that has never been modified.
 *
 * This test verifies that:
 * 1. A newly created section with no modifications returns an empty snapshot list
 * 2. Pagination metadata correctly shows zero records
 * 3. Filtering operations on empty data return empty results
 */
export async function test_api_section_snapshot_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a new section without any modifications
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 3. Test Case 1: Empty snapshot list
  const emptySnapshots =
    await api.functional.discussionBoard.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {} satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(emptySnapshots);
  // Validate empty data array
  TestValidator.equals("snapshot data is empty", emptySnapshots.data.length, 0);
  // Validate pagination metadata for zero records
  TestValidator.equals(
    "records count is zero",
    emptySnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count is zero",
    emptySnapshots.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is one",
    emptySnapshots.pagination.current,
    1,
  );
  // 4. Test Case 2: Filtering on empty data with search
  const filteredWithSearch =
    await api.functional.discussionBoard.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          search: "nonexistent",
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(filteredWithSearch);
  TestValidator.equals(
    "filtered data is still empty",
    filteredWithSearch.data.length,
    0,
  );
  // 5. Test Case 3: Filtering on empty data with date range
  const filteredWithDateRange =
    await api.functional.discussionBoard.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          fromDate: new Date("2020-01-01T00:00:00Z").toISOString(),
          toDate: new Date("2020-12-31T23:59:59Z").toISOString(),
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(filteredWithDateRange);
  TestValidator.equals(
    "date filtered data is still empty",
    filteredWithDateRange.data.length,
    0,
  );
  // 6. Test Case 4: Filtering on empty data with pagination
  const filteredWithPagination =
    await api.functional.discussionBoard.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          pageSize: 10,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(filteredWithPagination);
  TestValidator.equals(
    "paginated data is still empty",
    filteredWithPagination.data.length,
    0,
  );
  TestValidator.equals(
    "paginated records is zero",
    filteredWithPagination.pagination.records,
    0,
  );
}
