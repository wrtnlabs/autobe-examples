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

/**
 * Test archiving a section by updating its status to 'archived'.
 * 1. Authenticate as administrator
 * 2. Create an active section
 * 3. Update section status to archived
 * 4. Validate archived status and soft deletion timestamp
 */
export async function test_api_section_update_status_to_archived(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create an active section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Update section status to archived
  const updatedSection =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          status: "archived",
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // 4. Validate archived status and soft deletion
  TestValidator.equals(
    "status should be archived",
    updatedSection.status,
    "archived",
  );
  TestValidator.predicate(
    "deleted_at should be set",
    updatedSection.deleted_at !== null,
  );
  TestValidator.predicate(
    "deleted_at should be valid date",
    updatedSection.deleted_at !== null && updatedSection.deleted_at !== undefined && !isNaN(new Date(updatedSection.deleted_at).getTime()),
  );
  // 5. Verify section data preservation
  TestValidator.equals(
    "id should remain the same",
    updatedSection.id,
    section.id,
  );
  TestValidator.equals(
    "name should remain the same",
    updatedSection.name,
    section.name,
  );
  TestValidator.equals(
    "description should remain the same",
    updatedSection.description,
    section.description,
  );
  TestValidator.equals(
    "display_order should remain the same",
    updatedSection.display_order,
    section.display_order,
  );
}