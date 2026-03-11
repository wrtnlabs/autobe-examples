import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionSnapshot";
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

/**
 * Test retrieval of snapshots for a newly created section that has no historical snapshots.
 * Authenticate as superAdmin, create a fresh section, then attempt to retrieve snapshots
 * for that section. Validate that the system returns an empty data array with correct
 * pagination metadata (total records: 0, total pages: 0). Ensure the system handles
 * this gracefully without errors, and verify that the response structure remains
 * consistent with the schema even when no data exists. Also test with filters that
 * would definitely produce no results (e.g., date range in the distant future).
 */
export async function test_api_section_snapshot_retrieval_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create a fresh section without any snapshots
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Retrieve snapshots for the newly created section (should be empty)
  const snapshots =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate empty results
  TestValidator.equals("data array should be empty", snapshots.data, []);
  TestValidator.equals(
    "total records should be 0",
    snapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0",
    snapshots.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", snapshots.pagination.limit, 10);
  // 5. Test with filters that should produce no results
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year in future
  const filteredSnapshots =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          start_date: futureDate.toISOString(),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  // 6. Validate filtered empty results
  TestValidator.equals(
    "filtered data array should be empty",
    filteredSnapshots.data,
    [],
  );
  TestValidator.equals(
    "filtered total records should be 0",
    filteredSnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "filtered total pages should be 0",
    filteredSnapshots.pagination.pages,
    0,
  );
}
