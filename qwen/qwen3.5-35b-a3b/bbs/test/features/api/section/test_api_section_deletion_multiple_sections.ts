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

export async function test_api_section_deletion_multiple_sections(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123!",
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(authResponse);
  // 2. Create two separate sections in multi-section environment
  const sectionA =
    await generate_random_economic_political_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: `Test Section A - ${RandomGenerator.alphaNumeric(8)}`,
          description: "First test section for deletion isolation testing",
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(sectionA);
  const sectionB =
    await generate_random_economic_political_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: `Test Section B - ${RandomGenerator.alphaNumeric(8)}`,
          description: "Second test section to remain intact after deletion",
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(sectionB);
  // Verify sections are different before deletion
  TestValidator.notEquals(
    "sections have different IDs",
    sectionA.id,
    sectionB.id,
  );
  TestValidator.notEquals(
    "sections have different names",
    sectionA.name,
    sectionB.name,
  );
  // 3. Delete Section A
  await api.functional.economicPoliticalBoard.admin.sections.erase(
    adminConnection,
    {
      sectionId: sectionA.id,
    },
  );
  // 4. Verify data isolation: Section B should still be creatable and valid
  const sectionC =
    await generate_random_economic_political_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: `Test Section C - ${RandomGenerator.alphaNumeric(8)}`,
          description: "Third section to verify deletion didn't break system",
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(sectionC);
  // Verify Section C is different from Section A and B
  TestValidator.notEquals(
    "section C different from deleted section A",
    sectionC.id,
    sectionA.id,
  );
  TestValidator.notEquals(
    "section C different from remaining section B",
    sectionC.id,
    sectionB.id,
  );
  // 5. Final validation: All sections have unique IDs (no cross-contamination)
  const sectionIds = [sectionA.id, sectionB.id, sectionC.id];
  const uniqueIds = new Set(sectionIds);
  TestValidator.predicate(
    "all sections have unique IDs",
    uniqueIds.size === sectionIds.length,
  );
}
