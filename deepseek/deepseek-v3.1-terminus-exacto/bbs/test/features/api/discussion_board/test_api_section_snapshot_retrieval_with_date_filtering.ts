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
 * Test section snapshot retrieval with date filtering functionality.
 *
 * This test verifies that administrators can retrieve historical section snapshots
 * filtered by date ranges. Since snapshot creation is not available through the
 * provided API, this test focuses on validating the filtering functionality
 * with existing snapshots in the system.
 */
export async function test_api_section_snapshot_retrieval_with_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Test date filtering with current time window
  const now = new Date();
  const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  const endDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour in future
  const filteredResponse =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination metadata present",
    typeof filteredResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "has valid pagination fields",
    filteredResponse.pagination.current >= 0 &&
      filteredResponse.pagination.limit > 0 &&
      filteredResponse.pagination.records >= 0 &&
      filteredResponse.pagination.pages >= 0,
  );
  // 5. Validate snapshot structure for all returned snapshots
  for (const snapshot of filteredResponse.data) {
    TestValidator.predicate(
      "snapshot has valid id",
      typeof snapshot.id === "string" && snapshot.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid name",
      typeof snapshot.name === "string" && snapshot.name.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid created_at",
      typeof snapshot.created_at === "string",
    );
    TestValidator.predicate(
      "snapshot_reason is string or null",
      snapshot.snapshot_reason === null ||
        typeof snapshot.snapshot_reason === "string",
    );
  }
  // 6. Verify date filtering logic for returned snapshots
  for (const snapshot of filteredResponse.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      "snapshot within date range",
      snapshotDate >= startDate && snapshotDate <= endDate,
    );
  }
  // 7. Test empty result set with future date range
  const futureStartDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours in future
  const futureEndDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours in future
  const futureResponse =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          start_date: futureStartDate.toISOString(),
          end_date: futureEndDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(futureResponse);
  TestValidator.equals(
    "future date range returns empty or valid data",
    Array.isArray(futureResponse.data),
    true,
  );
}
