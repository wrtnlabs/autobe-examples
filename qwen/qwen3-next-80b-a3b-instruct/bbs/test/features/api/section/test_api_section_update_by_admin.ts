import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_economic_board_administrator_sections_create } from "../../../generate/generate_random_economic_board_administrator_sections_create";
import { prepare_random_economic_board_section } from "../../../prepare/prepare_random_economic_board_section";

export async function test_api_section_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two test sections: one to update, one to use as duplicate
  const sectionToEdit =
    await api.functional.economicBoard.administrator.sections.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEconomicBoardSection.ICreate,
      },
    );
  typia.assert(sectionToEdit);
  const duplicateSection =
    await api.functional.economicBoard.administrator.sections.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEconomicBoardSection.ICreate,
      },
    );
  typia.assert(duplicateSection);
  // 2. Authenticate as administrator
  const adminCredentials: IEconomicBoardAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminUser);
  // 3. Test successful update with unique name
  const updateResult =
    await api.functional.economicBoard.administrator.sections.update(
      adminConnection,
      {
        sectionId: sectionToEdit.id,
        body: {
          name: "Economics",
          description: "Study of economic systems and policies",
        },
      },
    );
  typia.assert(updateResult);
  // 4. Validate the successful update result
  TestValidator.equals("section name updated", updateResult.name, "Economics");
  TestValidator.equals(
    "section description updated",
    updateResult.description,
    "Study of economic systems and policies",
  );
  TestValidator.notEquals(
    "updated_at changed",
    updateResult.updated_at,
    sectionToEdit.updated_at,
  );
  TestValidator.equals(
    "section id preserved",
    updateResult.id,
    sectionToEdit.id,
  );
  // 5. Test that updating to a duplicate name fails
  await TestValidator.error("duplicate section name rejected", async () => {
    await api.functional.economicBoard.administrator.sections.update(
      adminConnection,
      {
        sectionId: sectionToEdit.id,
        body: {
          name: duplicateSection.name,
        },
      },
    );
  });
  // 6. Verify that admin credentials were necessary by testing with original connection
  // (This would typically return 403 Forbidden for non-admin user)
  await TestValidator.httpError("non-admin access denied", 403, async () => {
    await api.functional.economicBoard.administrator.sections.update(
      connection, // base connection without admin auth
      {
        sectionId: sectionToEdit.id,
        body: {
          name: "New Name",
        },
      },
    );
  });
}
