import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_section_creation_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator by joining the system
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@example.com",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // Update connection with new auth token
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // Generate random section creation data
  const sectionName = RandomGenerator.alphabets(7).toLowerCase(); // e.g. "economy"
  const sectionDescription = RandomGenerator.paragraph({ sentences: 2 });
  // Create the section
  const createdSection =
    await api.functional.economicBoard.administrator.sections.create(
      adminConnection,
      {
        body: {
          name: sectionName,
          description: sectionDescription,
        } satisfies IEconomicBoardSection.ICreate,
      },
    );
  typia.assert(createdSection);
  // Validate section properties
  TestValidator.equals(
    "section name normalized to title case",
    createdSection.name,
    sectionName.charAt(0).toUpperCase() + sectionName.slice(1),
  );
  TestValidator.predicate(
    "section has valid UUID",
    /^[0-9a-f-]{36}$/i.test(createdSection.id),
  );
  TestValidator.equals(
    "description matches",
    createdSection.description,
    sectionDescription,
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      createdSection.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      createdSection.updated_at,
    ),
  );
  TestValidator.equals(
    "section is not deleted",
    createdSection.deleted_at,
    null,
  );
}
