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

export async function test_api_section_partial_update_preserves_fields(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator first
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12345678",
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  typia.assert(authorized);
  // Create updated connection with authorization
  const createConnection: api.IConnection = { host: connection.host };
  createConnection.headers = {
    Authorization: `Bearer ${authorized.access_token}`,
  };
  // Create test section with initial name and description
  const createdSection =
    await api.functional.economicBoard.administrator.sections.create(
      createConnection,
      {
        body: {
          name: "Finance",
          description: "Market dynamics and investment",
        } satisfies IEconomicBoardSection.ICreate,
      },
    );
  typia.assert(createdSection);
  // Update connection for partial update
  const updateConnection: api.IConnection = { host: connection.host };
  updateConnection.headers = {
    Authorization: `Bearer ${authorized.access_token}`,
  };
  // Partially update section - modify only description
  const updatedSection =
    await api.functional.economicBoard.administrator.sections.update(
      updateConnection,
      {
        sectionId: createdSection.id,
        body: {
          description: "Financial systems and regulatory policy",
        } satisfies IEconomicBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // Validate that name was preserved and description was updated
  TestValidator.equals(
    "section name preserved",
    updatedSection.name,
    createdSection.name,
  );
  TestValidator.equals(
    "section description updated",
    updatedSection.description,
    "Financial systems and regulatory policy",
  );
  TestValidator.predicate(
    "updated_at changed (timestamp updated)",
    updatedSection.updated_at !== createdSection.updated_at,
  );
  TestValidator.predicate(
    "created_at unchanged",
    updatedSection.created_at === createdSection.created_at,
  );
  TestValidator.notEquals(
    "updated section ID matches",
    updatedSection.id,
    null,
  );
}
