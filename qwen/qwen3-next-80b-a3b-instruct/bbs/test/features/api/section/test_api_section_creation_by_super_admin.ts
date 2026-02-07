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

export async function test_api_section_creation_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SuperSecurePassword123!";
  // Use ILogin for login, not IJoin
  const loginBody = {
    email,
    password,
  } satisfies IEconomicBoardSuperAdministrator.ILogin;
  await authorize_super_administrator_login(superAdminConnection, {
    body: loginBody,
  });
  // Generate unique section name and description
  const sectionName = RandomGenerator.alphabets(8);
  const description = RandomGenerator.paragraph({ sentences: 2 });
  // Use utility function instead of SDK directly
  const createdSection =
    await generate_random_economic_board_super_administrator_sections_create(
      superAdminConnection,
      {
        body: {
          name: sectionName,
          description: description,
        },
      },
    );
  typia.assert(createdSection);
  // Validate section creation
  TestValidator.equals(
    "section name matches",
    createdSection.name,
    sectionName,
  );
  TestValidator.equals(
    "section description matches",
    createdSection.description,
    description,
  );
  TestValidator.predicate(
    "section has valid UUID",
    /^[0-9a-f-]{36}$/i.test(createdSection.id),
  );
  TestValidator.equals(
    "section status is active",
    createdSection.status,
    "active",
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    createdSection.created_at &&
      new Date(createdSection.created_at).toISOString() ===
        createdSection.created_at,
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    createdSection.updated_at &&
      new Date(createdSection.updated_at).toISOString() ===
        createdSection.updated_at,
  );
  TestValidator.equals("deleted_at is null", createdSection.deleted_at, null);
}
