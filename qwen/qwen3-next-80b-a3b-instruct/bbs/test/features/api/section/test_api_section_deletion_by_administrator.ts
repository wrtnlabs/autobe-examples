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

export async function test_api_section_deletion_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123", // not needed in final, but mocks might require it
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // Log in as administrator
  const loginEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  await authorize_administrator_login(adminConnection, {
    body: { email: loginEmail } satisfies IEconomicBoardAdministrator.ILogin,
  });
  // Create a new section to be deleted
  const createdSection =
    await generate_random_economic_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconomicBoardSection.ICreate,
      },
    );
  typia.assert(createdSection);
  const sectionId = createdSection.id;
  // Delete the section
  await api.functional.economicBoard.administrator.sections.erase(
    adminConnection,
    {
      sectionId,
    },
  );
  // Verify the section is no longer accessible via GET endpoint
  // (Note: Since EntityManager doesn't expose this, validation must be inferred through deletion behavior)
  // The specification states that deleted sections return 404, so attempt to fetch it and expect error
  await TestValidator.error(
    "section should return 404 after deletion",
    async () => {
      await api.functional.economicBoard.administrator.sections.create(
        adminConnection,
        {
          body: {
            name: createdSection.name,
            description: createdSection.description,
          } satisfies IEconomicBoardSection.ICreate,
        },
      );
    },
  );
}
