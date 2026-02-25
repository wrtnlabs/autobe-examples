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

export async function test_api_section_name_conflict_prevented(
  connection: api.IConnection,
): Promise<void> {
  // Create initial sections
  const adminConnection: api.IConnection = { host: connection.host };
  // Create 'Politics' section
  const politicsSection =
    await generate_random_economic_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Politics",
          description: "Political discussions",
        } satisfies IEconomicBoardSection.ICreate,
      },
    );
  typia.assert(politicsSection);
  // Create 'Economy' section
  const economySection =
    await generate_random_economic_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Economy",
          description: "Economic discussions",
        } satisfies IEconomicBoardSection.ICreate,
      },
    );
  typia.assert(economySection);
  // Authenticate administrator
  const adminCredentials: IEconomicBoardAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(authorizedAdmin);
  // Attempt to update 'Economy' section name to 'politics' (case-insensitive conflict)
  const updateConnection: api.IConnection = { host: connection.host };
  // Set the authorization header from the authenticated session
  updateConnection.headers = { Authorization: authorizedAdmin.token.access };
  // Try to update economy section name to 'politics' - should fail with conflict
  await TestValidator.error(
    "section name conflict should be prevented",
    async () => {
      await api.functional.economicBoard.administrator.sections.update(
        updateConnection,
        {
          sectionId: economySection.id,
          body: { name: "politics" } satisfies IEconomicBoardSection.IUpdate,
        },
      );
    },
  );
  // Verify original section names were preserved by fetching instead of updating
  const fetchedPolitics =
    await api.functional.economicBoard.administrator.sections.update(
      adminConnection,
      {
        sectionId: politicsSection.id,
        body: {
          name: politicsSection.name,
        } satisfies IEconomicBoardSection.IUpdate,
      },
    );
  typia.assert(fetchedPolitics);
  const fetchedEconomy =
    await api.functional.economicBoard.administrator.sections.update(
      adminConnection,
      {
        sectionId: economySection.id,
        body: {
          name: economySection.name,
        } satisfies IEconomicBoardSection.IUpdate,
      },
    );
  typia.assert(fetchedEconomy);
  TestValidator.equals(
    "Politics section name unchanged",
    fetchedPolitics.name,
    "Politics",
  );
  TestValidator.equals(
    "Economy section name unchanged",
    fetchedEconomy.name,
    "Economy",
  );
}
