import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
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

export async function test_api_section_retrieval_empty_articles(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin join for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create a new empty section
  const section =
    await generate_random_economic_political_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 6,
          }),
          description: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Step 3: Retrieve the section details
  const retrievedSection =
    await api.functional.economicPoliticalBoard.admin.sections.at(
      adminConnection,
      { sectionId: section.id },
    );
  typia.assert(retrievedSection);
  // Step 4: Verify section metadata
  TestValidator.equals("section id", retrievedSection.id, section.id);
  TestValidator.equals("section name", retrievedSection.name, section.name);
  TestValidator.equals(
    "section description",
    retrievedSection.description,
    section.description,
  );
  TestValidator.equals(
    "created_at timestamp",
    retrievedSection.created_at,
    section.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp",
    retrievedSection.updated_at,
    section.updated_at,
  );
  // Step 5: Verify articles array is empty (not null, not undefined)
  TestValidator.equals(
    "articles is empty array",
    retrievedSection.articles,
    [],
  );
  // Verify deleted_at is null for active section
  TestValidator.equals("deleted_at is null", retrievedSection.deleted_at, null);
  // Step 6: Verify articles array length is 0
  TestValidator.equals(
    "articles count is zero",
    retrievedSection.articles.length,
    0,
  );
}