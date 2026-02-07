import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import type { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_economy_politics_board_admin_sections_create } from "../../../generate/generate_random_economy_politics_board_admin_sections_create";
import { prepare_random_economy_politics_board_section } from "../../../prepare/prepare_random_economy_politics_board_section";

export async function test_api_section_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Admin auth setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string>() satisfies string & tags.Format<"email">,
      password: "1234",
      href: RandomGenerator.alphabets(10) + "/join",
      referrer: RandomGenerator.alphabets(10) + "/join",
      ip: typia.random<string>() satisfies string & tags.Format<"ipv4">,
    } satisfies IEconomyPoliticsBoardAdmin.IJoin,
  });
  // Create test section
  const section =
    await generate_random_economy_politics_board_admin_sections_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(section);
  // Update section
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedSection =
    await api.functional.economyPoliticsBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          name: `Updated ${section.name}`,
          description: newDescription satisfies string as string,
        } satisfies IEconomyPoliticsBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // Validate update
  TestValidator.equals(
    "name updated",
    updatedSection.name,
    `Updated ${section.name}`,
  );
  TestValidator.predicate(
    "description length",
    updatedSection.description.length >= 20,
  );
  TestValidator.predicate(
    "updated_at different from created_at",
    updatedSection.updated_at !== section.created_at,
  );
}
