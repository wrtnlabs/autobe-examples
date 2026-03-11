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

export async function test_api_admin_section_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminResponse);
  // 2. Create initial section
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const initialName = RandomGenerator.name();
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });
  const initialSection =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: initialName,
          description: initialDescription,
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(initialSection);
  const createdSectionId = initialSection.id;
  const createdAt = initialSection.created_at;
  const initialUpdatedAt = initialSection.updated_at;
  // Wait a small amount of time to ensure timestamp changes
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 3. Update the section with new name and description
  const updatedName = RandomGenerator.name();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedSection =
    await api.functional.economicPoliticalBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: createdSectionId,
        body: {
          name: updatedName,
          description: updatedDescription,
        } satisfies IEconomicPoliticalBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // 4. Validate the updated section
  TestValidator.equals(
    "section id unchanged",
    updatedSection.id,
    createdSectionId,
  );
  TestValidator.equals("name updated", updatedSection.name, updatedName);
  TestValidator.equals(
    "description updated",
    updatedSection.description,
    updatedDescription,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedSection.created_at,
    createdAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    initialUpdatedAt,
    updatedSection.updated_at,
  );
  TestValidator.equals("deleted_at is null", updatedSection.deleted_at, null);
  TestValidator.equals(
    "articles is array",
    Array.isArray(updatedSection.articles),
    true,
  );
}