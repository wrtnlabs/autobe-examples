import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_snapshot_history_multiple_modifications(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Step 2: Create initial section
  const initialSection =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Initial Section Name",
          description: "Initial section description for testing",
          status: "active",
          display_order: 1,
        },
      },
    );
  typia.assert(initialSection);
  // Store all section states for later validation
  const sectionStates: Array<{
    id: string;
    name: string;
    description: string;
    status: string;
    timestamp: Date;
  }> = [
    {
      id: initialSection.id,
      name: initialSection.name,
      description: initialSection.description,
      status: initialSection.status,
      timestamp: new Date(),
    },
  ];
  // Step 3: Perform first modification - name change
  const firstUpdate =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Updated Section Name 1",
          description: initialSection.description,
          status: initialSection.status,
          display_order: 1,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(firstUpdate);
  sectionStates.push({
    id: firstUpdate.id,
    name: firstUpdate.name,
    description: firstUpdate.description,
    status: firstUpdate.status,
    timestamp: new Date(),
  });
  // Step 4: Perform second modification - description update
  const secondUpdate =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: firstUpdate.name,
          description: "Updated description with more details",
          status: firstUpdate.status,
          display_order: 1,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(secondUpdate);
  sectionStates.push({
    id: secondUpdate.id,
    name: secondUpdate.name,
    description: secondUpdate.description,
    status: secondUpdate.status,
    timestamp: new Date(),
  });
  // Step 5: Perform third modification - status change
  const thirdUpdate =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: secondUpdate.name,
          description: secondUpdate.description,
          status: "inactive",
          display_order: 1,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(thirdUpdate);
  sectionStates.push({
    id: thirdUpdate.id,
    name: thirdUpdate.name,
    description: thirdUpdate.description,
    status: thirdUpdate.status,
    timestamp: new Date(),
  });
  // Step 6: Get snapshot history with default sorting (created_at desc)
  const snapshotHistory =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: initialSection.id satisfies string & tags.Format<"uuid">,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(snapshotHistory);
  // Validate pagination structure - focus on data array existence
  TestValidator.predicate(
    "has data array",
    Array.isArray(snapshotHistory.data),
  );
  // Step 7: Test sorting by created_at ascending
  const ascendingSnapshots =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: initialSection.id satisfies string & tags.Format<"uuid">,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(ascendingSnapshots);
  // Validate chronological order (oldest first)
  if (ascendingSnapshots.data.length >= 2) {
    const firstDate = new Date(ascendingSnapshots.data[0].created_at);
    const secondDate = new Date(ascendingSnapshots.data[1].created_at);
    TestValidator.predicate("ascending order", firstDate <= secondDate);
  }
  // Step 8: Test sorting by name
  const nameSortedSnapshots =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: initialSection.id satisfies string & tags.Format<"uuid">,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort: "name",
          order: "asc",
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(nameSortedSnapshots);
  // Validate name alphabetical order
  if (nameSortedSnapshots.data.length >= 2) {
    const firstName = nameSortedSnapshots.data[0].name;
    const secondName = nameSortedSnapshots.data[1].name;
    TestValidator.predicate(
      "alphabetical order",
      firstName.toLowerCase() <= secondName.toLowerCase(),
    );
  }
  // Step 9: Test pagination with smaller limit
  const firstPage =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: initialSection.id satisfies string & tags.Format<"uuid">,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate("page limit respected", firstPage.data.length <= 2);
  // Step 10: Validate audit trail integrity
  TestValidator.predicate(
    "has snapshot records",
    snapshotHistory.data.length > 0,
  );
  // Check that each snapshot has required fields
  for (const snapshot of snapshotHistory.data) {
    TestValidator.predicate(
      "snapshot has id",
      typeof snapshot.id === "string" && snapshot.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot has name",
      typeof snapshot.name === "string" && snapshot.name.length > 0,
    );
    TestValidator.predicate(
      "snapshot has description",
      typeof snapshot.description === "string",
    );
    TestValidator.predicate(
      "snapshot has created_at",
      typeof snapshot.created_at === "string" && snapshot.created_at.length > 0,
    );
  }
}
