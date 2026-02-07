import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_archives_empty_search_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin" + Date.now() + "@test.com",
      password: "testpassword123",
      display_name: "Test Administrator",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    },
  });
  typia.assert(adminAuth);
  // 2. Create a discussion board section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Test Section for Archive Search",
        description: "This is a test section for archive search functionality",
        display_order: 1,
      },
    },
  );
  typia.assert(section);
  // 3. Test search with non-existent reason text
  const searchResult1 =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          search: "non-existent-reason-text-that-will-never-match-anything",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchResult1);
  // Validate empty results
  TestValidator.equals("empty data array", searchResult1.data.length, 0);
  TestValidator.equals(
    "zero total records",
    searchResult1.pagination.records,
    0,
  );
  TestValidator.equals("zero total pages", searchResult1.pagination.pages, 0);
  TestValidator.equals(
    "current page is 1",
    searchResult1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    searchResult1.pagination.limit > 0,
  );
  // 4. Test search with future date range
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString(); // 30 days in future
  const searchResult2 =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          archivedAtFrom: futureDate,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchResult2);
  // Validate empty results
  TestValidator.equals(
    "empty data array for future date",
    searchResult2.data.length,
    0,
  );
  TestValidator.equals(
    "zero total records for future date",
    searchResult2.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero total pages for future date",
    searchResult2.pagination.pages,
    0,
  );
  // 5. Test search with non-existent administrator UUID
  const searchResult3 =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          archivedBy: "00000000-0000-0000-0000-000000000000",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchResult3);
  // Validate empty results
  TestValidator.equals(
    "empty data array for non-existent admin",
    searchResult3.data.length,
    0,
  );
  TestValidator.equals(
    "zero total records for non-existent admin",
    searchResult3.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero total pages for non-existent admin",
    searchResult3.pagination.pages,
    0,
  );
}
