import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_creation_with_description(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test case 1: Section with normal description
  const section1 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section1);
  // Test case 2: Section with null description
  const section2 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: null,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section2);
  TestValidator.equals(
    "null description preserved",
    section2.description,
    null,
  );
  // Test case 3: Section with empty description
  const section3 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: "",
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section3);
  TestValidator.equals("empty description preserved", section3.description, "");
  // Test case 4: Section with long description
  const section4 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section4);
  TestValidator.predicate(
    "long description preserved",
    section4.description !== null && section4.description.length > 100,
  );
  // Validate all sections have unique names
  const sectionNames = [section1, section2, section3, section4].map(
    (s) => s.name,
  );
  const uniqueNames = new Set(sectionNames);
  TestValidator.equals(
    "all sections have unique names",
    uniqueNames.size,
    sectionNames.length,
  );
}
