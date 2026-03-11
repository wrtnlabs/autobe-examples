import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_economic_political_board_admin_sections_create } from "../../../generate/generate_random_economic_political_board_admin_sections_create";
import { prepare_random_economic_political_board_section } from "../../../prepare/prepare_random_economic_political_board_section";

export async function test_api_section_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create admin connection with token
  const adminAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 2. Create first section with unique name
  const uniqueSectionName = `${RandomGenerator.alphabets(5)}_Section`;
  const firstSection =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminAuthenticatedConnection,
      {
        body: {
          name: uniqueSectionName,
          description: "Economic discussion section",
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(firstSection);
  // 3. Attempt to create duplicate section with same name (should fail with 409)
  await TestValidator.error(
    "duplicate section name should be rejected with 409",
    async () => {
      await api.functional.economicPoliticalBoard.admin.sections.create(
        adminAuthenticatedConnection,
        {
          body: {
            name: uniqueSectionName,
            description: "Duplicate section with same name",
          } satisfies IEconomicPoliticalBoardSection.ICreate,
        },
      );
    },
  );
  // 4. Verify original section data is intact by creating another unique section
  const anotherUniqueSectionName = `${RandomGenerator.alphabets(5)}_Section2`;
  const secondSection =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminAuthenticatedConnection,
      {
        body: {
          name: anotherUniqueSectionName,
          description: "Another unique section",
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(secondSection);
  // Verify the original section data is unchanged
  TestValidator.equals(
    "first section name intact",
    firstSection.name,
    uniqueSectionName,
  );
  TestValidator.notEquals(
    "different sections have different ids",
    firstSection.id,
    secondSection.id,
  );
  TestValidator.equals(
    "first section description intact",
    firstSection.description,
    "Economic discussion section",
  );
}
