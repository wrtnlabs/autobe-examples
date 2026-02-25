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
 * Test successful section update by an administrator.
 * 1. Create admin account and authenticate
 * 2. Create initial section to update
 * 3. Update section with modified fields
 * 4. Validate update response contains expected changes
 */
export async function test_api_section_update_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoinResponse);
  // 2. Create initial section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Update section with modified fields
  const updateData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "inactive" as const,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
    >(),
  } satisfies IDiscussionBoardSection.IUpdate;
  const updatedSection =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: section.id,
        body: updateData,
      },
    );
  typia.assert(updatedSection);
  // 4. Validate updates
  TestValidator.equals("section id unchanged", updatedSection.id, section.id);
  TestValidator.equals("name updated", updatedSection.name, updateData.name);
  TestValidator.equals(
    "description updated",
    updatedSection.description,
    updateData.description,
  );
  TestValidator.equals(
    "status updated",
    updatedSection.status,
    updateData.status,
  );
  TestValidator.equals(
    "display order updated",
    updatedSection.display_order,
    updateData.display_order,
  );
  // 5. Validate admin audit trail preserved
  TestValidator.equals(
    "created admin unchanged",
    updatedSection.createdByAdmin.id,
    section.createdByAdmin.id,
  );
  TestValidator.equals(
    "created admin email unchanged",
    updatedSection.createdByAdmin.email,
    section.createdByAdmin.email,
  );
  TestValidator.equals(
    "created admin display name unchanged",
    updatedSection.createdByAdmin.display_name,
    section.createdByAdmin.display_name,
  );
  TestValidator.equals(
    "created admin created_at unchanged",
    updatedSection.createdByAdmin.created_at,
    section.createdByAdmin.created_at,
  );
  // 6. Validate timestamps - created_at unchanged, updated_at should be newer
  TestValidator.equals(
    "created_at unchanged",
    updatedSection.created_at,
    section.created_at,
  );
  TestValidator.predicate(
    "updated_at should be newer than original",
    new Date(updatedSection.updated_at) > new Date(section.updated_at),
  );
  // 7. Validate relationships preserved
  TestValidator.notEquals(
    "lastModifiedByAdmin should not be null after update",
    updatedSection.lastModifiedByAdmin,
    null,
  );
  TestValidator.equals(
    "lastModifiedByAdmin should reference updating admin",
    updatedSection.lastModifiedByAdmin?.id,
    adminJoinResponse.id,
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedSection.deleted_at,
    null,
  );
}
