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

export async function test_api_section_update_name_and_remove_description(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "http://localhost",
      referrer: "http://localhost",
    },
  });
  const section =
    await generate_random_economic_political_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  const updatedSection =
    await api.functional.economicPoliticalDiscussionBoard.admin.sections.update(
      adminConnection,
      {
        id: section.id,
        body: {
          name: RandomGenerator.name(2),
          description: null,
        } satisfies IEconomicPoliticalDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  TestValidator.equals(
    "description should be null",
    updatedSection.description,
    null,
  );
  TestValidator.predicate(
    "updated_at should have been updated",
    new Date(updatedSection.updated_at) > new Date(section.updated_at),
  );
}
