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

export async function test_api_section_creation_success(
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
    },
  });
  typia.assert(adminAuth);
  // 2. Create section with unique name and description
  const sectionName = RandomGenerator.alphabets(12);
  const sectionDescription = RandomGenerator.paragraph({ sentences: 3 });
  const createdSection =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: sectionName,
          description: sectionDescription,
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(createdSection);
  // 3. Validate response structure
  TestValidator.equals(
    "section name matches",
    createdSection.name,
    sectionName,
  );
  TestValidator.equals(
    "section description matches",
    createdSection.description,
    sectionDescription,
  );
  TestValidator.equals(
    "deleted_at is null (not soft-deleted)",
    createdSection.deleted_at,
    null,
  );
  TestValidator.equals(
    "articles array is empty",
    createdSection.articles.length,
    0,
  );
  TestValidator.predicate(
    "articles is array",
    Array.isArray(createdSection.articles),
  );
  // 4. Validate timestamps are valid ISO 8601 date-time strings
  TestValidator.predicate(
    "created_at is valid date",
    () => !isNaN(Date.parse(createdSection.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    () => !isNaN(Date.parse(createdSection.updated_at)),
  );
  // 5. Validate id is valid UUID format using typia type validation
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.predicate(
    "id matches UUID format",
    uuidPattern.test(createdSection.id),
  );
  // 6. Validate timestamps are in ISO 8601 format
  const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/;
  TestValidator.predicate(
    "created_at is ISO 8601 format",
    dateTimePattern.test(createdSection.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 format",
    dateTimePattern.test(createdSection.updated_at),
  );
  // 7. Validate name has at least one character
  TestValidator.predicate(
    "section name is non-empty",
    createdSection.name.length > 0,
  );
  // 8. Validate description is provided
  TestValidator.predicate(
    "section description is provided",
    createdSection.description !== null &&
      createdSection.description !== undefined,
  );
}
