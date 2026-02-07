import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionArchive";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_section_archives_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Create a section ID for testing
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Test basic archive search functionality with date range parameters
  // Since we cannot create actual archives (no create endpoint provided),
  // we test that the filtering API accepts valid date range parameters
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  // Test 1: Valid date range filtering
  const startDate = new Date(now.getTime() + oneDayMs * -7).toISOString(); // 7 days ago
  const endDate = new Date(now.getTime() + oneDayMs * 1).toISOString(); // Tomorrow
  const filteredArchives =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      {
        sectionId,
        body: {
          archivedAtFrom: startDate,
          archivedAtTo: endDate,
          limit: 10,
          page: 1,
          sort: "archived_at_desc" as const,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(filteredArchives);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure exists",
    typeof filteredArchives.pagination,
    "object",
  );
  TestValidator.predicate(
    "has valid current page",
    filteredArchives.pagination.current >= 0,
  );
  TestValidator.predicate(
    "has valid limit",
    filteredArchives.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "has valid records count",
    filteredArchives.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages count",
    filteredArchives.pagination.pages >= 0,
  );
  // Test 2: Filter with only end date (archives before specific date)
  const beforeDate = new Date(now.getTime() + oneDayMs * -1).toISOString(); // Yesterday
  const archivesBefore =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      {
        sectionId,
        body: {
          archivedAtTo: beforeDate,
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(archivesBefore);
  // Test 3: Filter with only start date (archives after specific date)
  const afterDate = new Date(now.getTime() + oneDayMs * -3).toISOString(); // 3 days ago
  const archivesAfter =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      {
        sectionId,
        body: {
          archivedAtFrom: afterDate,
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(archivesAfter);
  // Test 4: Verify default sorting behavior
  const defaultSortedArchives =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      {
        sectionId,
        body: {
          limit: 10,
          page: 1,
          // No sort specified - should use default
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(defaultSortedArchives);
  // Test 5: Different sorting options
  const sortingOptions = [
    "archived_at_asc",
    "reason_asc",
    "reason_desc",
  ] as const;
  for (const sortOption of sortingOptions) {
    const sortedArchives =
      await api.functional.discussionBoard.admin.sections.archives.index(
        adminConnection,
        {
          sectionId,
          body: {
            limit: 5,
            page: 1,
            sort: sortOption,
          } satisfies IDiscussionBoardSectionArchive.IRequest,
        },
      );
    typia.assert(sortedArchives);
  }
  // Test 6: Pagination controls
  const paginationTest =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      {
        sectionId,
        body: {
          limit: 3,
          page: 1,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(paginationTest);
  // Validate that pagination controls are respected
  TestValidator.predicate(
    "limit is respected",
    paginationTest.pagination.limit === 3,
  );
  TestValidator.predicate(
    "current page is correct",
    paginationTest.pagination.current === 1,
  );
}
