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

export async function test_api_section_creation_case_insensitive_collision(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first administrator connection and authenticate
  const adminConnection1: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  const admin1 = await authorize_administrator_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  adminConnection1.headers!.Authorization = admin1.access_token;
  // 2. Create second administrator connection and authenticate
  const adminConnection2: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  const admin2 = await authorize_administrator_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  adminConnection2.headers!.Authorization = admin2.access_token;
  // 3. Admin1 creates section "Economy"
  const economySection =
    await generate_random_economic_board_administrator_sections_create(
      adminConnection1,
      {
        body: {
          name: "Economy",
          description: "Economic discussion and analysis",
        } satisfies IEconomicBoardSection.ICreate,
      },
    );
  typia.assert(economySection);
  // 4. Admin2 attempts to create case-insensitive duplicate section "economy"
  await TestValidator.error(
    "case-insensitive duplicate section should return 409",
    async () => {
      await generate_random_economic_board_administrator_sections_create(
        adminConnection2,
        {
          body: {
            name: "economy", // lowercase variant of existing name
            description: "Economic discussion and analysis",
          } satisfies IEconomicBoardSection.ICreate,
        },
      );
    },
  );
}
