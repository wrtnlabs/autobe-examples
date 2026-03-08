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

export async function test_api_admin_section_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: "TestAdmin123!",
      href: "http://test.example.com/join",
      referrer: "http://test.example.com",
    },
  });
  typia.assert(adminAuthorized);
  // 2. Create section using admin connection
  const section =
    await generate_random_economic_political_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: "Economic Policy Discussion",
          description:
            "Discussion about economic policies and their impact on society",
        },
      },
    );
  typia.assert(section);
  // 3. Validate business logic - names match exactly
  TestValidator.equals(
    "section name matches input",
    section.name,
    "Economic Policy Discussion",
  );
  TestValidator.equals(
    "section description matches input",
    section.description,
    "Discussion about economic policies and their impact on society",
  );
  TestValidator.equals("section not deleted", section.deleted_at, null);
  TestValidator.equals("section has no articles", section.articles.length, 0);
  TestValidator.equals(
    "section has valid articleCount from summary",
    section.articles.length,
    0,
  );
}