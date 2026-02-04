import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import type { IEconPoliticBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_econ_politic_board_admin_sections_create } from "../../../generate/generate_random_econ_politic_board_admin_sections_create";
import { prepare_random_econ_politic_board_section } from "../../../prepare/prepare_random_econ_politic_board_section";

export async function test_api_section_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEconPoliticBoardAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: RandomGenerator.alphaNumeric(10) + "@example.com",
        password: "password123",
      } satisfies IEconPoliticBoardAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create section with initial name and description
  const initialSection: IEconPoliticBoardSection =
    await generate_random_econ_politic_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }) + " Section",
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IEconPoliticBoardSection.ICreate,
      },
    );
  typia.assert(initialSection);
  TestValidator.equals(
    "created section name matches",
    initialSection.name,
    initialSection.name,
  );
  TestValidator.equals(
    "created section description matches",
    initialSection.description,
    initialSection.description,
  );
  // 3. Update section with new name and description
  const updatedSection: IEconPoliticBoardSection =
    await api.functional.econPoliticBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: initialSection.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }) + " Updated",
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IEconPoliticBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // 4. Verify update
  TestValidator.equals(
    "updated section name matches",
    updatedSection.name,
    RandomGenerator.paragraph({ sentences: 2 }) + " Updated",
  );
  TestValidator.equals(
    "updated section description matches",
    updatedSection.description,
    RandomGenerator.content({ paragraphs: 2 }),
  );
  TestValidator.equals(
    "article count unchanged",
    initialSection.articleCount,
    updatedSection.articleCount,
  );
}
