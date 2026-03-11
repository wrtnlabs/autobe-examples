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

export async function test_api_section_snapshot_retrieval_with_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create a test section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Retrieve snapshots with date range filtering
  const currentDate = new Date().toISOString();
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
  // Test with valid date range (past to current)
  const snapshotsWithRange =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          start_date: pastDate satisfies string & tags.Format<"date-time">,
          end_date: currentDate satisfies string & tags.Format<"date-time">,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsWithRange);
  // Test with future date range (should return empty)
  const snapshotsFuture =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          start_date: futureDate satisfies string & tags.Format<"date-time">,
          end_date: futureDate satisfies string & tags.Format<"date-time">,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsFuture);
  // Test without date filtering for comparison
  const snapshotsAll =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsAll);
  // 4. Validate business logic
  // Future date range should return empty data
  TestValidator.equals(
    "future date range returns empty results",
    snapshotsFuture.data.length,
    0,
  );
  // Date filtering should respect the range
  TestValidator.predicate(
    "date filtered results should be subset of all results",
    snapshotsWithRange.data.length <= snapshotsAll.data.length,
  );
  // Validate pagination integrity
  TestValidator.predicate(
    "pagination records count is consistent",
    snapshotsWithRange.pagination.records >= snapshotsWithRange.data.length,
  );
  TestValidator.predicate(
    "current page is within valid range",
    snapshotsWithRange.pagination.current >= 1 &&
      snapshotsWithRange.pagination.current <=
        snapshotsWithRange.pagination.pages,
  );
  // Validate snapshot metadata when data exists
  if (snapshotsWithRange.data.length > 0) {
    const snapshot = snapshotsWithRange.data[0];
    TestValidator.predicate(
      "snapshot has valid UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    TestValidator.predicate(
      "snapshot has non-empty name",
      snapshot.name.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid ISO date format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        snapshot.created_at,
      ),
    );
  }
  // Test section isolation by ensuring we can't access snapshots from other sections
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should error when accessing non-existent section",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
        superAdminConnection,
        {
          sectionId: nonExistentSectionId,
          body: {
            page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IDiscussionBoardSectionSnapshot.IRequest,
        },
      );
    },
  );
}
