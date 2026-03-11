import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_super_admin_section_creation_unique_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create first section with unique name
  const section1Input = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph(),
  } satisfies IDiscussionBoardSection.ICreate;
  const section1 =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: section1Input,
      },
    );
  typia.assert(section1);
  // 3. Validate section properties
  TestValidator.equals("name matches input", section1.name, section1Input.name);
  TestValidator.equals(
    "description matches input",
    section1.description,
    section1Input.description,
  );
  TestValidator.predicate(
    "id is UUID format",
    /^[0-9a-f-]{36}$/i.test(section1.id),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(section1.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(section1.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null for active section",
    section1.deleted_at,
    null,
  );
  // 4. Test duplicate name error
  await TestValidator.error(
    "duplicate section name should be rejected",
    async () => {
      await generate_random_discussion_board_super_admin_sections_create(
        superAdminConnection,
        {
          body: {
            name: section1Input.name,
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    },
  );
  // 5. Create second section with different name
  const section2Name = RandomGenerator.name(2);
  const section2 =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: section2Name,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section2);
  // 6. Validate second section
  TestValidator.equals(
    "second section name matches",
    section2.name,
    section2Name,
  );
  TestValidator.notEquals(
    "section IDs should differ",
    section1.id,
    section2.id,
  );
  TestValidator.notEquals(
    "section names should differ",
    section1.name,
    section2.name,
  );
  TestValidator.equals(
    "second section deleted_at null",
    section2.deleted_at,
    null,
  );
  // 7. Test creation with null description
  const sectionWithNullDesc =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: null,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(sectionWithNullDesc);
  TestValidator.equals(
    "null description preserved",
    sectionWithNullDesc.description,
    null,
  );
}
