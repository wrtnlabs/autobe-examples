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

export async function test_api_section_snapshot_history_access_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator to access audit trail
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconomicBoardAdministrator.IJoin;
  await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  // 2. Create a section to generate audit snapshots for retrieval
  const section =
    await generate_random_economic_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(section);
  // 3. Retrieve the snapshot history for this section (should contain the creation snapshot)
  const snapshots =
    await api.functional.economicBoard.administrator.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {},
      },
    );
  typia.assert(snapshots);
  // 4. Validate response structure
  TestValidator.equals("pagination structure", snapshots.pagination.current, 1);
  TestValidator.equals("pagination limit", snapshots.pagination.limit, 10);
  TestValidator.equals("number of snapshots", snapshots.data.length, 1);
  // Verify snapshot content matches the created section
  const snapshot = snapshots.data[0];
  TestValidator.equals(
    "snapshot section name matches",
    snapshot.section_name,
    section.name,
  );
  TestValidator.equals(
    "snapshot section description matches",
    snapshot.section_description,
    section.description,
  );
  // Validate snapshot_reason is not empty (business logic)
  TestValidator.predicate(
    "snapshot_reason is not empty",
    snapshot.snapshot_reason.length > 0,
  );
  // Validate pagination metadata
  TestValidator.equals(
    "total records in pagination",
    snapshots.pagination.records,
    1,
  );
  TestValidator.equals("total pages", snapshots.pagination.pages, 1);
}
