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

/**
 * Test that an administrator can successfully update a section's name and description.
 *
 * Workflow:
 * 1. Register admin user
 * 2. Create test section
 * 3. Update section
 * 4. Verify changes
 */
export async function test_api_section_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string>() satisfies string,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string>() satisfies string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string,
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create test section with initial data
  const originalSection =
    await generate_random_economic_political_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: "Test Section",
          description: "Original description",
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(originalSection);
  const originalCreatedAt = originalSection.created_at;
  const originalId = originalSection.id;
  const originalArticlesLength = originalSection.articles.length;
  // 3. Update section with new name and description
  const updatedSection =
    await api.functional.economicPoliticalBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: originalSection.id,
        body: {
          name: "Updated Section",
          description: "Updated description",
        } satisfies IEconomicPoliticalBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // 4. Verify update response contains correct data
  TestValidator.equals("section id unchanged", updatedSection.id, originalId);
  TestValidator.equals(
    "section name updated",
    updatedSection.name,
    "Updated Section",
  );
  TestValidator.equals(
    "section description updated",
    updatedSection.description,
    "Updated description",
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedSection.created_at,
    originalCreatedAt,
  );
  TestValidator.equals("deleted_at is null", updatedSection.deleted_at, null);
  TestValidator.equals(
    "articles array unchanged",
    updatedSection.articles.length,
    originalArticlesLength,
  );
  // 5. Verify updated_at is new timestamp (within last 60 seconds)
  TestValidator.predicate("updated_at reflects recent timestamp", () => {
    const updateTime = new Date(updatedSection.updated_at).getTime();
    const now = Date.now();
    return updateTime > now - 60000;
  });
  // 6. Verify that updated_at differs from original section
  TestValidator.notEquals(
    "updated_at changed",
    updatedSection.updated_at,
    originalSection.updated_at,
  );
}