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
 * Test filtering section snapshots by capture date range.
 * 1. Admin authentication succeeds
 * 2. Section creation succeeds
 * 3. Query with captured_at_from parameter returns only snapshots captured on or after the specified timestamp
 * 4. Query with captured_at_to parameter returns only snapshots captured on or before the specified timestamp
 * 5. Query with both parameters returns snapshots within the inclusive date range
 * 6. Snapshots outside the date range are excluded from results
 * 7. Pagination metadata correctly reflects filtered result count
 */
export async function test_api_section_snapshot_filtering_by_date_range(
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
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Create multiple snapshots at different times
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5); // 5 days ago
  const midDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2); // 2 days ago
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2); // 2 days in future
  // Generate snapshots with different captured_at times
  const snapshots = ArrayUtil.repeat(3, (index) => ({
    id: typia.random<string & tags.Format<"uuid">>(),
    captured_at: [pastDate, midDate, futureDate][index].toISOString(),
    name: section.name,
    description: section.description,
    section_created_at: section.created_at,
    section_updated_at: section.updated_at,
    section_deleted_at: null,
  }));
  // 4. Query with captured_at_from parameter
  const fromResult =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          captured_at_from: midDate.toISOString(),
          limit: 100,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(fromResult);
  // Verify only snapshots from midDate onwards are returned
  TestValidator.predicate(
    "captured_at_from filter returns snapshots on or after specified date",
    fromResult.data.every(
      (snapshot) => new Date(snapshot.captured_at) >= midDate,
    ),
  );
  TestValidator.equals(
    "from filter count matches expected",
    fromResult.data.length,
    2,
  );
  // 5. Query with captured_at_to parameter
  const toResult =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          captured_at_to: midDate.toISOString(),
          limit: 100,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(toResult);
  // Verify only snapshots up to midDate are returned
  TestValidator.predicate(
    "captured_at_to filter returns snapshots on or before specified date",
    toResult.data.every(
      (snapshot) => new Date(snapshot.captured_at) <= midDate,
    ),
  );
  TestValidator.equals(
    "to filter count matches expected",
    toResult.data.length,
    2,
  );
  // 6. Query with both parameters (date range)
  const rangeResult =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          captured_at_from: pastDate.toISOString(),
          captured_at_to: futureDate.toISOString(),
          limit: 100,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(rangeResult);
  // Verify all snapshots within range are returned
  TestValidator.predicate(
    "date range filter returns snapshots within inclusive range",
    rangeResult.data.every(
      (snapshot) =>
        new Date(snapshot.captured_at) >= pastDate &&
        new Date(snapshot.captured_at) <= futureDate,
    ),
  );
  TestValidator.equals(
    "range filter count matches expected",
    rangeResult.data.length,
    3,
  );
  // 7. Verify pagination metadata
  TestValidator.equals(
    "pagination records matches data length",
    rangeResult.pagination.records,
    rangeResult.data.length,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    rangeResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is set correctly",
    rangeResult.pagination.limit > 0,
  );
}
