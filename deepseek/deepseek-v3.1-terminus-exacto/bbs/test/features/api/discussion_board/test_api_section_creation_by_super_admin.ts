import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

export async function test_api_section_creation_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create first section
  const sectionBody: IDiscussionBoardSection.ICreate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
  } satisfies IDiscussionBoardSection.ICreate;
  const section =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      { body: sectionBody },
    );
  typia.assert(section);
  // Validate business logic (not type validation which is handled by typia.assert)
  TestValidator.equals("section name matches", section.name, sectionBody.name);
  TestValidator.equals(
    "section description matches",
    section.description,
    sectionBody.description,
  );
  TestValidator.equals(
    "section display order matches",
    section.display_order,
    sectionBody.display_order,
  );
  TestValidator.equals("section status is active", section.status, "active");
  TestValidator.predicate(
    "createdByAdmin exists",
    section.createdByAdmin !== undefined,
  );
  // Test duplicate section name constraint
  await TestValidator.error("duplicate section name should fail", async () => {
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      { body: sectionBody },
    );
  });
}
