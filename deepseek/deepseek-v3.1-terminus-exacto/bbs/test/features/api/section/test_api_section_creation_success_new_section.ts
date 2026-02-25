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

export async function test_api_section_creation_success_new_section(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create section with valid parameters
  const sectionBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IDiscussionBoardSection.ICreate;
  const createdSection =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      { body: sectionBody },
    );
  typia.assert(createdSection);
  // Validate section creation response - Business logic only (no type validation)
  TestValidator.equals(
    "section name matches",
    createdSection.name,
    sectionBody.name,
  );
  TestValidator.equals(
    "section description matches",
    createdSection.description,
    sectionBody.description,
  );
  TestValidator.equals(
    "section status matches",
    createdSection.status,
    sectionBody.status,
  );
  TestValidator.equals(
    "section display order matches",
    createdSection.display_order,
    sectionBody.display_order,
  );
  TestValidator.equals("section not deleted", createdSection.deleted_at, null);
  // Verify admin assignment consistency - handle null case properly
  if (superAdmin.admin !== null) {
    TestValidator.equals(
      "created by admin matches authenticated superAdmin",
      createdSection.createdByAdmin.id,
      superAdmin.admin.id,
    );
  } else {
    TestValidator.predicate(
      "superAdmin has admin assignment",
      superAdmin.admin !== null,
    );
  }
}
