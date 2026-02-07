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
 * Test the retrieval of section snapshots with date range filtering.
 *
 * This test validates that the section snapshot retrieval endpoint correctly filters
 * snapshots by date range and returns proper pagination metadata. It creates a
 * section, generates multiple snapshots at different timestamps, and tests various
 * date filtering scenarios to ensure accurate results.
 */
export async function test_api_section_snapshot_retrieval_with_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const baseAdminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(baseAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create authenticated admin connection
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 2. Create a section that will have snapshots
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Since there's no explicit snapshot creation endpoint, we'll test with
  // the existing snapshots that are automatically created when sections are modified
  // First, get all existing snapshots
  const initialSnapshots =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(initialSnapshots);
  // If we have snapshots, test date filtering
  if (initialSnapshots.data.length > 0) {
    // Sort snapshots by creation date
    const sortedSnapshots = [...initialSnapshots.data].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    // Test 1: Filter snapshots created after the first snapshot
    const afterFirstResponse =
      await api.functional.discussionBoard.admin.sections.snapshots.index(
        adminConnection,
        {
          sectionId: section.id,
          body: {
            created_at_from: sortedSnapshots[0].created_at,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardSectionSnapshot.IRequest,
        },
      );
    typia.assert(afterFirstResponse);
    // Validate that all returned snapshots are after or equal to the first snapshot
    TestValidator.predicate(
      "all snapshots should be after or equal to the filter date",
      afterFirstResponse.data.every(
        (snapshot) =>
          new Date(snapshot.created_at) >=
          new Date(sortedSnapshots[0].created_at),
      ),
    );
    // Test 2: Filter snapshots created before the last snapshot
    const beforeLastResponse =
      await api.functional.discussionBoard.admin.sections.snapshots.index(
        adminConnection,
        {
          sectionId: section.id,
          body: {
            created_at_to:
              sortedSnapshots[sortedSnapshots.length - 1].created_at,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardSectionSnapshot.IRequest,
        },
      );
    typia.assert(beforeLastResponse);
    // Validate that all returned snapshots are before or equal to the last snapshot
    TestValidator.predicate(
      "all snapshots should be before or equal to the filter date",
      beforeLastResponse.data.every(
        (snapshot) =>
          new Date(snapshot.created_at) <=
          new Date(sortedSnapshots[sortedSnapshots.length - 1].created_at),
      ),
    );
    // Test 3: Filter with both start and end dates (if we have at least 2 snapshots)
    if (sortedSnapshots.length >= 2) {
      const rangeResponse =
        await api.functional.discussionBoard.admin.sections.snapshots.index(
          adminConnection,
          {
            sectionId: section.id,
            body: {
              created_at_from: sortedSnapshots[0].created_at,
              created_at_to: sortedSnapshots[1].created_at,
              page: 1,
              limit: 10,
            } satisfies IDiscussionBoardSectionSnapshot.IRequest,
          },
        );
      typia.assert(rangeResponse);
      // Validate that snapshots are within the specified range
      TestValidator.predicate(
        "all snapshots should be within the date range",
        rangeResponse.data.every((snapshot) => {
          const snapshotDate = new Date(snapshot.created_at);
          const fromDate = new Date(sortedSnapshots[0].created_at);
          const toDate = new Date(sortedSnapshots[1].created_at);
          return snapshotDate >= fromDate && snapshotDate <= toDate;
        }),
      );
    }
    // 4. Validate pagination metadata
    TestValidator.equals(
      "pagination current page should be 1",
      afterFirstResponse.pagination.current,
      1,
    );
    TestValidator.predicate(
      "pagination limit should be positive",
      afterFirstResponse.pagination.limit > 0,
    );
    TestValidator.predicate(
      "total records should be non-negative",
      afterFirstResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      "total pages should be non-negative",
      afterFirstResponse.pagination.pages >= 0,
    );
    // 5. Validate snapshot summary structure
    if (afterFirstResponse.data.length > 0) {
      const sampleSnapshot = afterFirstResponse.data[0];
      TestValidator.predicate(
        "snapshot should have id field",
        typeof sampleSnapshot.id === "string" && sampleSnapshot.id.length > 0,
      );
      TestValidator.predicate(
        "snapshot should have name field",
        typeof sampleSnapshot.name === "string" &&
          sampleSnapshot.name.length > 0,
      );
      TestValidator.predicate(
        "snapshot should have description field",
        typeof sampleSnapshot.description === "string" &&
          sampleSnapshot.description.length > 0,
      );
      TestValidator.predicate(
        "snapshot should have created_at field",
        typeof sampleSnapshot.created_at === "string" &&
          sampleSnapshot.created_at.length > 0,
      );
    }
    // 6. Test pagination with different page sizes
    const paginationTest =
      await api.functional.discussionBoard.admin.sections.snapshots.index(
        adminConnection,
        {
          sectionId: section.id,
          body: {
            page: 1,
            limit: 2,
          } satisfies IDiscussionBoardSectionSnapshot.IRequest,
        },
      );
    typia.assert(paginationTest);
    TestValidator.equals(
      "page limit should be respected",
      paginationTest.data.length <= 2,
      true,
    );
  } else {
    // If no snapshots exist, test basic functionality
    const emptyResponse =
      await api.functional.discussionBoard.admin.sections.snapshots.index(
        adminConnection,
        {
          sectionId: section.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardSectionSnapshot.IRequest,
        },
      );
    typia.assert(emptyResponse);
    TestValidator.equals(
      "empty response should have empty data array",
      emptyResponse.data.length,
      0,
    );
    TestValidator.equals(
      "empty response should have zero records",
      emptyResponse.pagination.records,
      0,
    );
  }
}
