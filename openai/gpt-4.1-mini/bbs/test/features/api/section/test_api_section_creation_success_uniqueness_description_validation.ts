import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

type FullSection = IDiscussionBoardSection & {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
};

export async function test_api_section_creation_success_uniqueness_description_validation(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Scenario 1: Successful creation of a new section
  const createBody1 = {
    name: `section-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardSection.ICreate;
  const section1Raw =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: createBody1,
      },
    );
  // Assert as FullSection to access the properties
  const section1 = typia.assert<FullSection>(section1Raw);
  TestValidator.predicate(
    "section id exists",
    typeof section1.id === "string" && section1.id.length > 0,
  );
  TestValidator.predicate(
    "section created_at is ISO string",
    typeof section1.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(section1.created_at),
  );
  TestValidator.predicate(
    "section updated_at is ISO string",
    typeof section1.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(section1.updated_at),
  );
  TestValidator.equals("section name matches", section1.name, createBody1.name);
  TestValidator.equals(
    "section description matches",
    section1.description,
    createBody1.description,
  );
  // Scenario 2: Attempt to create section with duplicate name
  await TestValidator.error("duplicate section name", async () => {
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: createBody1.name,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  });
  // Scenario 3: Attempt to create section with empty description
  await TestValidator.error("empty description validation", async () => {
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: `unique-${RandomGenerator.alphabets(8)}`,
          description: "",
        },
      },
    );
  });
}
