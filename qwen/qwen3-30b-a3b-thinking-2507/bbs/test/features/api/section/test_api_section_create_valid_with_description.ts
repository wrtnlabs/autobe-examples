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

export async function test_api_section_create_valid_with_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "http://example.com",
      referrer: "http://example.com",
    },
  });
  // 2. Create valid section
  const section =
    await generate_random_economic_political_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: "Politics",
          description: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 15,
          }),
        },
      },
    );
  typia.assert(section);
  // 3. Validate
  TestValidator.equals("section name matches", section.name, "Politics");
  TestValidator.predicate(
    "description length >= 10",
    section.description !== null &&
      section.description !== undefined &&
      section.description.length >= 10,
  );
}
