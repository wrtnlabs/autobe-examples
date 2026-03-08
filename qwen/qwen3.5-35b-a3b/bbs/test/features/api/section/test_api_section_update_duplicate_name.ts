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

export async function test_api_section_update_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create section A with name 'Economy'
  const economySection =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: "Economy",
          description: "Economic discussions",
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(economySection);
  // 3. Create section B with name 'Politics'
  const politicsSection =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: "Politics",
          description: "Political discussions",
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(politicsSection);
  // 4. Attempt to update section B to use name 'Economy' (duplicate)
  await TestValidator.error(
    "should fail with 409 Conflict on duplicate section name",
    async () => {
      await api.functional.economicPoliticalBoard.admin.sections.update(
        adminConnection,
        {
          sectionId: politicsSection.id,
          body: {
            name: "Economy",
          } satisfies IEconomicPoliticalBoardSection.IUpdate,
        },
      );
    },
  );
  // 5. Verify section B still exists and name unchanged
  const updatedSection =
    await api.functional.economicPoliticalBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: politicsSection.id,
        body: {
          description: "Political discussions",
        } satisfies IEconomicPoliticalBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  TestValidator.equals(
    "section name remains Politics after failed update",
    updatedSection.name,
    "Politics",
  );
}