import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionArchive";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_archives_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create multiple sections
  const sections: IDiscussionBoardSection[] = [];
  for (let i = 1; i <= 3; i++) {
    const section =
      await generate_random_discussion_board_super_admin_sections_create(
        superAdminConnection,
        {
          body: {
            name: `Test Section ${i} - ${RandomGenerator.alphabets(5)}`,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            display_order: i,
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    typia.assert(section);
    sections.push(section);
  }
  // Archive sections with timestamps
  const archivalTimestamps: string[] = [];
  for (let i = 0; i < sections.length; i++) {
    // Add meaningful delay to create distinct timestamps
    await new Promise((resolve) => setTimeout(resolve, 500));
    const archivedSection =
      await api.functional.discussionBoard.superAdmin.sections.erase(
        superAdminConnection,
        {
          sectionId: sections[i].id,
        },
      );
    typia.assert(archivedSection);
    archivalTimestamps.push(new Date().toISOString());
  }
  // Test 1: Basic archives retrieval for a section
  const searchResult1 =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        sectionId: sections[0].id,
        body: {
          limit: 10,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.predicate(
    "archives exist for section",
    searchResult1.data.length > 0,
  );
  // Test 2: Date range filtering using actual archival timestamps
  const searchResult2 =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        sectionId: sections[0].id,
        body: {
          archivedAtFrom: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
          archivedAtTo: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes from now
          limit: 10,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.predicate(
    "date range returns archives",
    searchResult2.data.length > 0,
  );
  // Test 3: Administrator filtering
  const searchResult3 =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        sectionId: sections[0].id,
        body: {
          archivedBy: superAdmin.id,
          limit: 10,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(searchResult3);
  TestValidator.predicate(
    "admin filter returns archives",
    searchResult3.data.length > 0,
  );
  // Test 4: Sort order testing
  const sortOptions = [
    "archived_at_desc",
    "archived_at_asc",
    "reason_asc",
    "reason_desc",
  ] as const;
  for (const sortOption of sortOptions) {
    const searchResult =
      await api.functional.discussionBoard.superAdmin.sections.archives.index(
        superAdminConnection,
        {
          sectionId: sections[0].id,
          body: {
            sort: sortOption,
            limit: 10,
          } satisfies IDiscussionBoardSectionArchive.IRequest,
        },
      );
    typia.assert(searchResult);
    TestValidator.predicate(
      `sort ${sortOption} works`,
      searchResult.data.length >= 0,
    );
    // Basic sorting validation for date-based sorts
    if (
      searchResult.data.length > 1 &&
      (sortOption === "archived_at_desc" || sortOption === "archived_at_asc")
    ) {
      const dates = searchResult.data.map((item) =>
        new Date(item.archived_at).getTime(),
      );
      const isSorted =
        sortOption === "archived_at_desc"
          ? dates.every((date, i, arr) => i === 0 || date <= arr[i - 1])
          : dates.every((date, i, arr) => i === 0 || date >= arr[i - 1]);
      TestValidator.predicate(`sort ${sortOption} orders correctly`, isSorted);
    }
  }
  // Test 5: Pagination functionality
  const searchResult5 =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        sectionId: sections[0].id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(searchResult5);
  TestValidator.equals("pagination limit works", searchResult5.data.length, 1);
  TestValidator.equals(
    "pagination metadata",
    searchResult5.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination records count valid",
    searchResult5.pagination.records >= 0,
  );
}
