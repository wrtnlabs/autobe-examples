import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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

export async function test_api_section_snapshot_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create initial section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Perform multiple updates to create snapshots at different timestamps
  const update1 = await api.functional.discussionBoard.admin.sections.update(
    adminConnection,
    {
      sectionId: section.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.IUpdate,
    },
  );
  typia.assert(update1);
  // Wait briefly to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const update2 = await api.functional.discussionBoard.admin.sections.update(
    adminConnection,
    {
      sectionId: section.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.IUpdate,
    },
  );
  typia.assert(update2);
  // Wait briefly to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const update3 = await api.functional.discussionBoard.admin.sections.update(
    adminConnection,
    {
      sectionId: section.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.IUpdate,
    },
  );
  typia.assert(update3);
  // 4. Query all snapshots to get the full list
  const allSnapshots =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 100,
          sort: "asc",
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Should have at least 3 snapshots (one per update)
  TestValidator.predicate(
    "has at least 3 snapshots",
    () => allSnapshots.data.length >= 3,
  );
  // 5. Test date range filtering - get timestamps from snapshots
  const sortedSnapshots = allSnapshots.data.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  // Filter by middle snapshot's date range
  const middleSnapshot = sortedSnapshots[1];
  const fromTime = new Date(middleSnapshot.created_at);
  const toTime = new Date(fromTime.getTime() + 1000 * 60 * 60 * 24); // 1 day later
  const filteredSnapshots =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 100,
          from: fromTime.toISOString(),
          to: toTime.toISOString(),
          sort: "asc",
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  // Validate all filtered snapshots are within date range
  for (const snapshot of filteredSnapshots.data) {
    const snapshotTime = new Date(snapshot.created_at).getTime();
    TestValidator.predicate(
      `snapshot ${snapshot.id} within from date`,
      () => snapshotTime >= fromTime.getTime(),
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} within to date`,
      () => snapshotTime <= toTime.getTime(),
    );
  }
  // 6. Test descending sort order
  const descSnapshots =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 100,
          sort: "desc",
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(descSnapshots);
  // Validate descending order
  for (let i = 1; i < descSnapshots.data.length; i++) {
    const prevTime = new Date(descSnapshots.data[i - 1].created_at).getTime();
    const currTime = new Date(descSnapshots.data[i].created_at).getTime();
    TestValidator.predicate(
      `descending order at index ${i}`,
      () => prevTime >= currTime,
    );
  }
  // 7. Test pagination on filtered results
  const paginatedSnapshots =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 2,
          sort: "asc",
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginatedSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedSnapshots.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination records matches total",
    () =>
      paginatedSnapshots.pagination.records ===
      paginatedSnapshots.data.length +
        (paginatedSnapshots.pagination.pages > 1
          ? paginatedSnapshots.pagination.limit
          : 0),
  );
  // Test second page if exists
  if (paginatedSnapshots.pagination.pages > 1) {
    const page2Snapshots =
      await api.functional.discussionBoard.admin.sections.snapshots.index(
        adminConnection,
        {
          sectionId: section.id,
          body: {
            page: 2,
            limit: 2,
            sort: "asc",
          } satisfies IDiscussionBoardSectionSnapshot.IRequest,
        },
      );
    typia.assert(page2Snapshots);
    TestValidator.equals(
      "page 2 current page",
      page2Snapshots.pagination.current,
      2,
    );
    TestValidator.notEquals(
      "page 2 has different data",
      page2Snapshots.data[0]?.id ?? null,
      paginatedSnapshots.data[0]?.id ?? null,
    );
  }
}
