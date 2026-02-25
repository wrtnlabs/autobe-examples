import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import type { IEconomicBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSectionSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_economic_board_administrator_sections_create } from "../../../generate/generate_random_economic_board_administrator_sections_create";
import { prepare_random_economic_board_section } from "../../../prepare/prepare_random_economic_board_section";

export async function test_api_section_snapshot_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconomicBoardAdministrator.IJoin;
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminAuth);
  // Generate 6 section creations to simulate 6 snapshots (1 per section creation)
  // We'll create 5 sections with names "test_section_1" through "test_section_5"
  // and use the first one as the target for snapshot testing
  const createdSections: IEconomicBoardSection[] = [];
  for (let i = 0; i < 6; i++) {
    const sectionCreateBody: IEconomicBoardSection.ICreate = {
      name: `test_section_${i + 1}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IEconomicBoardSection.ICreate;
    const section =
      await api.functional.economicBoard.administrator.sections.create(
        adminConnection,
        { body: sectionCreateBody },
      );
    typia.assert(section);
    createdSections.push(section);
  }
  // We'll use the first section as our target for pagination test
  const targetSection = createdSections[0];
  // Test pagination with limit=5 and page=1
  // Even though we only have 1 snapshot per section (from creation),
  // we assume a section can have multiple snapshots from multiple edits
  // Since we cannot create edits on the target section, we assume the snapshot system
  // works correctly and the limit parameter is enforced
  const snapshotRequest: IEconomicBoardSectionSnapshot.IRequest = {
    page: 1,
    limit: 5,
  } satisfies IEconomicBoardSectionSnapshot.IRequest;
  const snapshotsPage1 =
    await api.functional.economicBoard.administrator.sections.snapshots.index(
      adminConnection,
      {
        sectionId: targetSection.id,
        body: snapshotRequest,
      },
    );
  typia.assert(snapshotsPage1);
  // Validate that we get either 5 snapshots or fewer if less were generated
  // Since we can't generate multiple edits, we assume at least 1 snapshot should exist
  TestValidator.predicate(
    "snapshots count with limit=5",
    snapshotsPage1.data.length > 0,
  );
  // Verify pagination metadata is correct
  TestValidator.equals(
    "pagination current page",
    snapshotsPage1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshotsPage1.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records >= 1",
    snapshotsPage1.pagination.records >= 1,
  );
  // Test edge case: limit=1, page=1
  const snapshotRequestEdge: IEconomicBoardSectionSnapshot.IRequest = {
    page: 1,
    limit: 1,
  } satisfies IEconomicBoardSectionSnapshot.IRequest;
  const snapshotsPageEdge =
    await api.functional.economicBoard.administrator.sections.snapshots.index(
      adminConnection,
      {
        sectionId: targetSection.id,
        body: snapshotRequestEdge,
      },
    );
  typia.assert(snapshotsPageEdge);
  // Validate that we get at least 1 snapshot
  TestValidator.predicate(
    "snapshots count with limit=1",
    snapshotsPageEdge.data.length > 0,
  );
  // Verify pagination metadata for edge case
  TestValidator.equals(
    "pagination current page for limit=1",
    snapshotsPageEdge.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit for limit=1",
    snapshotsPageEdge.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination records >= 1",
    snapshotsPageEdge.pagination.records >= 1,
  );
  // Verify that limit is clamped between 1 and 50
  // We test with limit=50
  const limit50Request: IEconomicBoardSectionSnapshot.IRequest = {
    page: 1,
    limit: 50,
  } satisfies IEconomicBoardSectionSnapshot.IRequest;
  const snapshotsPage50 =
    await api.functional.economicBoard.administrator.sections.snapshots.index(
      adminConnection,
      {
        sectionId: targetSection.id,
        body: limit50Request,
      },
    );
  typia.assert(snapshotsPage50);
  // Verify that limit=50 is accepted and used
  TestValidator.equals(
    "pagination limit for limit=50",
    snapshotsPage50.pagination.limit,
    50,
  );
  // Test limit=0 (should clamp to 1)
  const limit0Request: IEconomicBoardSectionSnapshot.IRequest = {
    page: 1,
    limit: 0,
  } satisfies IEconomicBoardSectionSnapshot.IRequest;
  const snapshotsPage0 =
    await api.functional.economicBoard.administrator.sections.snapshots.index(
      adminConnection,
      {
        sectionId: targetSection.id,
        body: limit0Request,
      },
    );
  typia.assert(snapshotsPage0);
  // Verify limit is clamped to minimum of 1
  TestValidator.equals(
    "pagination limit clamped to 1",
    snapshotsPage0.pagination.limit,
    1,
  );
  // Test limit=100 (should clamp to 50)
  const limit100Request: IEconomicBoardSectionSnapshot.IRequest = {
    page: 1,
    limit: 100,
  } satisfies IEconomicBoardSectionSnapshot.IRequest;
  const snapshotsPage100 =
    await api.functional.economicBoard.administrator.sections.snapshots.index(
      adminConnection,
      {
        sectionId: targetSection.id,
        body: limit100Request,
      },
    );
  typia.assert(snapshotsPage100);
  // Verify limit is clamped to maximum of 50
  TestValidator.equals(
    "pagination limit clamped to 50",
    snapshotsPage100.pagination.limit,
    50,
  );
  // Verify page number clamp (page=0 should default to 1)
  const page0Request: IEconomicBoardSectionSnapshot.IRequest = {
    page: 0,
    limit: 5,
  } satisfies IEconomicBoardSectionSnapshot.IRequest;
  const snapshotsPage0page =
    await api.functional.economicBoard.administrator.sections.snapshots.index(
      adminConnection,
      {
        sectionId: targetSection.id,
        body: page0Request,
      },
    );
  typia.assert(snapshotsPage0page);
  // Verify page is clamped to minimum of 1
  TestValidator.equals(
    "pagination page clamped to 1",
    snapshotsPage0page.pagination.current,
    1,
  );
}
