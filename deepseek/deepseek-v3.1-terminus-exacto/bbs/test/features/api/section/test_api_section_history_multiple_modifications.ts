import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
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

export async function test_api_section_history_multiple_modifications(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Use authorize_admin_join to create admin account
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuthorized);
  // 2. Create initial section
  const initialSection =
    await api.functional.discussionBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          status: "active",
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(initialSection);
  // 3. First modification
  const firstUpdateName = RandomGenerator.paragraph({ sentences: 2 });
  const firstUpdateDescription = RandomGenerator.content({ paragraphs: 1 });
  const afterFirstUpdate =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: initialSection.id,
        body: {
          name: firstUpdateName satisfies string &
            tags.MinLength<2> &
            tags.MaxLength<50>,
          description: firstUpdateDescription satisfies string &
            tags.MinLength<10> &
            tags.MaxLength<500>,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(afterFirstUpdate);
  // Wait a bit to ensure timestamps differ
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 4. Second modification
  const secondUpdateName = RandomGenerator.paragraph({ sentences: 2 });
  const secondUpdateDescription = RandomGenerator.content({ paragraphs: 1 });
  const afterSecondUpdate =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: initialSection.id,
        body: {
          name: secondUpdateName satisfies string &
            tags.MinLength<2> &
            tags.MaxLength<50>,
          description: secondUpdateDescription satisfies string &
            tags.MinLength<10> &
            tags.MaxLength<500>,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(afterSecondUpdate);
  // 5. Retrieve paginated snapshots
  const snapshotsPage1 =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: initialSection.id,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort: "created_at" as const,
          order: "desc" as const,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage1);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    snapshotsPage1.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    snapshotsPage1.pagination.pagination.pagination.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records should be at least 3 (initial + 2 modifications)",
    snapshotsPage1.pagination.pagination.pagination.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pages should be at least 1",
    snapshotsPage1.pagination.pagination.pagination.pagination.pages >= 1,
  );
  // 7. Validate chronological order (newest first due to descending order)
  if (snapshotsPage1.data.length >= 2) {
    for (let i = 0; i < snapshotsPage1.data.length - 1; i++) {
      const current = new Date(snapshotsPage1.data[i].created_at);
      const next = new Date(snapshotsPage1.data[i + 1].created_at);
      TestValidator.predicate(
        `snapshot ${i} should be newer than snapshot ${i + 1}`,
        current >= next,
      );
    }
  }
  // 8. Verify snapshots contain correct historical data
  // We have at least 3 snapshots: initial creation, first update, second update
  TestValidator.predicate(
    "should have at least 3 snapshots",
    snapshotsPage1.data.length >= 3,
  );
  // Find the most recent snapshot (should be after second update)
  const newestSnapshot = snapshotsPage1.data[0];
  TestValidator.equals(
    "newest snapshot name should match second update",
    newestSnapshot.name,
    secondUpdateName,
  );
  TestValidator.equals(
    "newest snapshot description should match second update",
    newestSnapshot.description,
    secondUpdateDescription,
  );
  // Find the middle snapshot (should be after first update)
  const middleSnapshot = snapshotsPage1.data[1];
  TestValidator.equals(
    "middle snapshot name should match first update",
    middleSnapshot.name,
    firstUpdateName,
  );
  TestValidator.equals(
    "middle snapshot description should match first update",
    middleSnapshot.description,
    firstUpdateDescription,
  );
  // 9. Test pagination with page 2 if available
  if (snapshotsPage1.pagination.pagination.pagination.pagination.pages > 1) {
    const snapshotsPage2 =
      await api.functional.discussionBoard.admin.sections.snapshots.index(
        adminConnection,
        {
          sectionId: initialSection.id,
          body: {
            page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
            sort: "created_at" as const,
            order: "desc" as const,
          } satisfies IDiscussionBoardSectionSnapshot.IRequest,
        },
      );
    typia.assert(snapshotsPage2);
    TestValidator.equals(
      "page 2 current page should be 2",
      snapshotsPage2.pagination.pagination.pagination.pagination.current,
      2,
    );
  }
}
