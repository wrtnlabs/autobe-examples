import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdmin";
import type { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_economic_political_discussion_board_admin_sections_create } from "../../../generate/generate_random_economic_political_discussion_board_admin_sections_create";
import { prepare_random_economic_political_discussion_board_section } from "../../../prepare/prepare_random_economic_political_discussion_board_section";

export async function test_api_section_update_with_name_and_description(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "http://localhost:3000/auth",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IEconomicPoliticalDiscussionBoardAdmin.IJoin,
  });
  // 2. Create section with minimum required values
  const section =
    await api.functional.economicPoliticalDiscussionBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(2),
          description: "Min section description.",
        } satisfies IEconomicPoliticalDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Update section name to exactly 40 characters and description to exactly 250 characters
  const updatedSection =
    await api.functional.economicPoliticalDiscussionBoard.admin.sections.update(
      adminConnection,
      {
        id: section.id,
        body: {
          name: RandomGenerator.alphabets(40),
          description: RandomGenerator.paragraph({ sentences: 5 }).substring(
            0,
            250,
          ),
        } satisfies IEconomicPoliticalDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // 4. Validate name length constraint (40 characters)
  TestValidator.equals("name length matches", updatedSection.name.length, 40);
  // 5. Validate description length constraint (exactly 250 characters)
  TestValidator.equals(
    "description length matches",
    updatedSection.description?.length,
    250,
  );
  // 6. Validate updated_at timestamp format
  TestValidator.predicate(
    "updated_at is valid date-time format",
    updatedSection.updated_at ===
      new Date(updatedSection.updated_at).toISOString(),
  );
}
