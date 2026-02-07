import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_economic_board_super_administrator_sections_create } from "../../../generate/generate_random_economic_board_super_administrator_sections_create";
import { prepare_random_economic_board_section } from "../../../prepare/prepare_random_economic_board_section";

export async function test_api_section_creation_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPass123!",
  } satisfies IEconomicBoardSuperAdministrator.IJoin;
  await authorize_super_administrator_login(superAdminConnection, {
    body: superAdminCredentials,
  });
  // Create first section with unique name (using RandomGenerator.name(2) to ensure uppercase letters for case-insensitive test)
  const firstSectionName = RandomGenerator.name(2); // Produces capitalized names like "Foo Bar" for case-insensitive testing
  const firstSection =
    await generate_random_economic_board_super_administrator_sections_create(
      superAdminConnection,
      {
        body: {
          name: firstSectionName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEconomicBoardSection.ICreate,
      },
    );
  typia.assert(firstSection);
  TestValidator.equals(
    "first section created successfully",
    firstSection.name,
    firstSectionName,
  );
  // Attempt to create duplicate section with same name in lowercase to test case-insensitive matching
  // This should fail with 409 Conflict
  await TestValidator.error(
    "duplicate section name rejection (case-insensitive)",
    async () => {
      await generate_random_economic_board_super_administrator_sections_create(
        superAdminConnection,
        {
          body: {
            name: firstSectionName.toLowerCase(), // Test case-insensitive match by using lowercase variation
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IEconomicBoardSection.ICreate,
        },
      );
    },
  );
}
