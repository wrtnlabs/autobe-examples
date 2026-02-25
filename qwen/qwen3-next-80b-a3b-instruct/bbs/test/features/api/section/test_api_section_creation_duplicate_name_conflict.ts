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

export async function test_api_section_creation_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "securePassword123",
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // Create first section with unique name
  const firstSection =
    await generate_random_economic_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Politics",
          description: "Discussion about government and policy",
        },
      },
    );
  typia.assert(firstSection);
  TestValidator.equals(
    "first section created successfully",
    firstSection.name,
    "Politics",
  );
  // Attempt to create second section with duplicate name (case-insensitive)
  await TestValidator.error(
    "should reject duplicate section name",
    async () => {
      await generate_random_economic_board_administrator_sections_create(
        adminConnection,
        {
          body: {
            name: "politics", // Case-insensitive duplicate
            description: "Another politics section",
          },
        },
      );
    },
  );
  // Verify first section still exists and is unchanged
  const retrievedSection =
    await generate_random_economic_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Politics", // Should retrieve same section
          description: "Updated description", // Even with update, section should be unchanged
        },
      },
    );
  typia.assert(retrievedSection);
  TestValidator.equals(
    "first section unchanged",
    retrievedSection.name,
    "Politics",
  );
}
