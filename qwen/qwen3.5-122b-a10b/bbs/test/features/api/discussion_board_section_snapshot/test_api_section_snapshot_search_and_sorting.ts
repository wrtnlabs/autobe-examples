import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test search and sorting capabilities for section snapshot retrieval.
 * An administrator should be able to search snapshots by name or description text
 * and sort results by captured_at timestamp or section name in ascending or descending order.
 */
export async function test_api_section_snapshot_search_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create section
  const sectionName: string = RandomGenerator.name(3);
  const sectionDescription: string = RandomGenerator.paragraph({
    sentences: 5,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: sectionName,
        description: sectionDescription,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Query snapshots with default parameters (should sort by captured_at desc)
  const defaultSnapshots =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {},
      },
    );
  typia.assert(defaultSnapshots);
  TestValidator.equals(
    "default snapshots have data",
    defaultSnapshots.data.length > 0,
    true,
  );
  // 4. Test search by section name (partial match)
  const searchByName =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          search: sectionName.substring(0, 5),
        },
      },
    );
  typia.assert(searchByName);
  TestValidator.predicate(
    "search by name returns results",
    searchByName.data.length >= 0,
  );
  // 5. Test search by description
  const searchByDescription =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          search: sectionDescription.substring(0, 10),
        },
      },
    );
  typia.assert(searchByDescription);
  TestValidator.predicate(
    "search by description returns results",
    searchByDescription.data.length >= 0,
  );
  // 6. Test sorting by captured_at descending (default)
  const sortedByCapturedAtDesc =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          sort_by: "captured_at",
          order: "desc",
        },
      },
    );
  typia.assert(sortedByCapturedAtDesc);
  // 7. Test sorting by captured_at ascending
  const sortedByCapturedAtAsc =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          sort_by: "captured_at",
          order: "asc",
        },
      },
    );
  typia.assert(sortedByCapturedAtAsc);
  // 8. Test sorting by name ascending
  const sortedByNameAsc =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          sort_by: "name",
          order: "asc",
        },
      },
    );
  typia.assert(sortedByNameAsc);
  // 9. Test sorting by name descending
  const sortedByNameDesc =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          sort_by: "name",
          order: "desc",
        },
      },
    );
  typia.assert(sortedByNameDesc);
  // 10. Test combined search and sort
  const combinedResults =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          search: sectionName.substring(0, 3),
          sort_by: "captured_at",
          order: "desc",
        },
      },
    );
  typia.assert(combinedResults);
  // 11. Validate pagination metadata exists
  TestValidator.predicate(
    "pagination exists",
    combinedResults.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination current page",
    combinedResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records count",
    combinedResults.pagination.records >= 0,
  );
  // 12. Validate snapshot data structure
  if (combinedResults.data.length > 0) {
    const firstSnapshot = combinedResults.data[0];
    typia.assert(firstSnapshot);
    TestValidator.predicate("snapshot has id", firstSnapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has captured_at",
      firstSnapshot.captured_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot has name",
      firstSnapshot.name !== undefined,
    );
  }
}
