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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_admin_sections_create } from "../../../generate/generate_random_economic_political_board_admin_sections_create";
import { prepare_random_economic_political_board_section } from "../../../prepare/prepare_random_economic_political_board_section";

export async function test_api_section_update_member_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup: Register and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail satisfies string as string,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string,
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // Login as admin with valid credentials
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail satisfies string as string,
      password: adminPassword,
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  // 2. Admin creates a section
  const section =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Store original section data for validation
  const originalName = section.name;
  const originalDescription = section.description;
  // 3. Member setup: Register and login as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberJoinResult = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail satisfies string as string,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string,
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberJoinResult);
  // Login as member with valid credentials
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail satisfies string as string,
      password: memberPassword,
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  // 4. Member attempts to update section (should fail with 403 Forbidden)
  const updateBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IEconomicPoliticalBoardSection.IUpdate;
  await TestValidator.error(
    "member cannot update section (403 Forbidden)",
    async () => {
      await api.functional.economicPoliticalBoard.admin.sections.update(
        memberConnection,
        {
          sectionId: section.id,
          body: updateBody,
        },
      );
    },
  );
  // 5. Validate section remains unchanged in database
  const retrievedSection =
    await api.functional.economicPoliticalBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: section.id,
        body: {},
      },
    );
  typia.assert(retrievedSection);
  TestValidator.equals(
    "section name unchanged after failed update",
    retrievedSection.name,
    originalName,
  );
  TestValidator.equals(
    "section description unchanged after failed update",
    retrievedSection.description,
    originalDescription,
  );
}