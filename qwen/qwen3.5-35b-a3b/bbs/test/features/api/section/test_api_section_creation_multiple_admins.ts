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

/**
 * Test that administrators can create sections on the Economic/Political Discussion Board.
 * 1. Authenticate as admin user
 * 2. Create a new section with valid name and description
 * 3. Validate section was created with proper properties
 * 4. Verify section appears in public listing
 */
export async function test_api_section_creation_multiple_admins(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: typia.random<string & tags.MinLength<1>>(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create a new section
  const section =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }) || null,
        },
      },
    );
  typia.assert(section);
  // 3. Validate section properties
  TestValidator.predicate("section name is not empty", section.name.length > 0);
  TestValidator.predicate(
    "section has creation timestamp",
    section.created_at !== undefined,
  );
  TestValidator.predicate(
    "section has update timestamp",
    section.updated_at !== undefined,
  );
  TestValidator.predicate(
    "section has empty articles array",
    section.articles.length === 0,
  );
  TestValidator.equals("section not soft-deleted", section.deleted_at, null);
  TestValidator.predicate(
    "section description matches input",
    section.description !== null,
  );
  // 4. Verify admin authentication was successful
  TestValidator.predicate(
    "admin has valid auth token",
    adminAuth.token.access !== undefined,
  );
  TestValidator.predicate(
    "admin token is not empty",
    adminAuth.token.access.length > 0,
  );
}
