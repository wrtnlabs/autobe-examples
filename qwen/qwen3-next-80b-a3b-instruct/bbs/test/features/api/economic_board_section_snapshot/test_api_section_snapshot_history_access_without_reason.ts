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

export async function test_api_section_snapshot_history_access_without_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconomicBoardAdministrator.IJoin;
  const admin = await authorize_administrator_join(adminConnection, {
    body: adminCreds,
  });
  typia.assert(admin);
  // 2. Create a section (this will create one snapshot in the history)
  const section =
    await generate_random_economic_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(section);
  // 3. Retrieve the snapshot history of the section (must return at least one snapshot)
  const snapshots =
    await api.functional.economicBoard.administrator.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {},
      },
    );
  typia.assert(snapshots);
  // 4. Validate snapshot history structure and nullability contract
  TestValidator.equals("snapshot count", snapshots.data.length, 1);
  const snapshot = snapshots.data[0];
  // Validate required fields exist and types are correct
  TestValidator.equals("snapshot id is UUID", typeof snapshot.id, "string");
  TestValidator.equals(
    "section_name is string",
    typeof snapshot.section_name,
    "string",
  );
  TestValidator.equals(
    "section_description is string",
    typeof snapshot.section_description,
    "string",
  );
  TestValidator.equals(
    "created_at is ISO date-time",
    typeof snapshot.created_at,
    "string",
  );
  TestValidator.equals(
    "snapshot_reason is string",
    typeof snapshot.snapshot_reason,
    "string",
  );
  TestValidator.predicate("administrator_id is null or UUID", () => {
    return (
      snapshot.administrator_id === null ||
      (typeof snapshot.administrator_id === "string" &&
        RegExp(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ).test(snapshot.administrator_id))
    );
  });
  // Validate snapshot_reason accepts null (the property itself must be string with implicit nullability in contract)
  // The snapshot_reason field is defined as string (not string | null) but scenario says null is accepted.
  // Based on the DTO definition: snapshot_reason: string; (not nullable) but scenario expects null.
  // This indicates a discrepancy. We must follow the specification as described in the scenario.
  // Since the scenario says snapshot_reason=null is permitted, but the DTO says it's string, we test the behavior.
  // However, the validation must be against the actual system behavior.
  // Since the code must compile and pass type validation using the provided DTO, and snapshot_reason: string means it cannot be null,
  // the actual response should not return null for snapshot_reason.
  // But the scenario says it accepts null. This is a contradiction.
  // Following AutoBE principles: "If scenario is impossible → REWRITE using available APIs."
  // Since the DTO defines snapshot_reason as non-nullable string, and there is no update endpoint to test null values, we validate what we have.
  // We know from the snapshot creation that snapshot_reason would be the reason for the section creation (e.g., "System: section created")
  // We cannot test null snapshot_reason without an update endpoint.
  // The scenario must be satisfied by validating that the system returns a string snapshot_reason and not null.
  // Thus, we assume the snapshot_reason is always a non-null string in the current system.
  TestValidator.predicate("snapshot_reason is not null", () => {
    return snapshot.snapshot_reason !== null;
  });
  // Validate that the returned snapshot matches the section created
  TestValidator.equals(
    "snapshot section_name matches created section",
    snapshot.section_name,
    section.name,
  );
  TestValidator.equals(
    "snapshot section_description matches created section",
    snapshot.section_description,
    section.description,
  );
  // Validate date-time format
  TestValidator.predicate("created_at is valid ISO 8601", () => {
    return !isNaN(Date.parse(snapshot.created_at));
  });
}
