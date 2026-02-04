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

export async function test_api_section_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authorize
  const adminConnection: api.IConnection = { host: connection.host },
    admin = await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "S3cureP@ss123",
        nickname: RandomGenerator.name(2),
        mobile: RandomGenerator.mobile(),
      },
    });
  typia.assert(admin);
  // 2. Create a new section using admin connection
  const section =
    await generate_random_econ_politic_board_admin_sections_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(section);
  // 3. Retrieve the section publicly
  const retrievedSection = await api.functional.econPoliticBoard.sections.at(
    connection,
    {
      sectionId: section.id,
    },
  );
  typia.assert(retrievedSection);
  // 4. Validate the retrieved section matches the created section
  TestValidator.equals(
    "section name matches",
    retrievedSection.name,
    section.name,
  );
  TestValidator.equals(
    "section description matches",
    retrievedSection.description,
    section.description,
  );
  TestValidator.equals(
    "article count matches",
    retrievedSection.articleCount,
    section.articleCount,
  );
}
