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
 * Test retrieving historical section snapshots with various filtering options.
 *
 * This test validates the snapshot retrieval functionality for discussion board
 * sections, including search filtering, date range filtering, pagination, and
 * sorting capabilities.
 */
export async function test_api_section_snapshot_retrieval_with_filters(
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
  // 2. Create a section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(section);
  // 3. Test basic retrieval without filters
  const basicResult =
    await api.functional.discussionBoard.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {},
      },
    );
  typia.assert(basicResult);
  TestValidator.predicate(
    "basic retrieval returns valid pagination structure",
    () =>
      basicResult.pagination.current >= 1 &&
      basicResult.pagination.limit >= 1 &&
      basicResult.pagination.records >= 0 &&
      basicResult.pagination.pages >= 0,
  );
  // 4. Test search filtering
  const searchResult =
    await api.functional.discussionBoard.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          search: section.name.substring(0, 5),
        },
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search filtering returns valid response structure",
    () => Array.isArray(searchResult.data),
  );
  // 5. Test date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day future
  const dateRangeResult =
    await api.functional.discussionBoard.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          fromDate: pastDate.toISOString(),
          toDate: futureDate.toISOString(),
        },
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filtering returns valid response structure",
    () => Array.isArray(dateRangeResult.data),
  );
  // 6. Test pagination
  const paginationResult =
    await api.functional.discussionBoard.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          pageSize: 10,
        },
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination current page matches request",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginationResult.pagination.limit,
    10,
  );
  // 7. Test sorting by different fields
  const sortByCreatedAsc =
    await api.functional.discussionBoard.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(sortByCreatedAsc);
  TestValidator.predicate(
    "sorting by created_at ascending returns valid response",
    () => Array.isArray(sortByCreatedAsc.data),
  );
  const sortByNameDesc =
    await api.functional.discussionBoard.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          sortBy: "name",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(sortByNameDesc);
  TestValidator.predicate(
    "sorting by name descending returns valid response",
    () => Array.isArray(sortByNameDesc.data),
  );
  // 8. Test empty results with far future date range
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year future
  const emptyResult =
    await api.functional.discussionBoard.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          fromDate: farFuture.toISOString(),
          toDate: new Date(
            farFuture.getTime() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty date range returns zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.predicate(
    "empty result has empty data array",
    () => emptyResult.data.length === 0,
  );
  // 9. Validate snapshot structure if data exists
  if (basicResult.data.length > 0) {
    const snapshot = basicResult.data[0];
    typia.assertGuard(snapshot);
    // Validate business logic: section reference matches parent
    TestValidator.equals(
      "snapshot section id matches parent section",
      snapshot.section.id,
      section.id,
    );
    // Validate description can be null or string (already validated by typia)
    TestValidator.predicate(
      "snapshot description is null or string",
      () =>
        snapshot.description === null ||
        typeof snapshot.description === "string",
    );
    // Validate all required timestamps exist
    TestValidator.predicate(
      "snapshot has section_created_at timestamp",
      () => typeof snapshot.section_created_at === "string",
    );
    TestValidator.predicate(
      "snapshot has section_updated_at timestamp",
      () => typeof snapshot.section_updated_at === "string",
    );
    TestValidator.predicate(
      "snapshot has created_at timestamp",
      () => typeof snapshot.created_at === "string",
    );
  }
}
