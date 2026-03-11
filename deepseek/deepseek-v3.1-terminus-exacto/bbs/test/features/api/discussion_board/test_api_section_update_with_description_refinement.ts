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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_update_with_description_refinement(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Step 2: Create a section using the super admin connection
  const initialSection =
    await generate_random_discussion_board_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(initialSection);
  // Step 3: Record the original timestamps
  const originalCreatedAt = new Date(initialSection.created_at);
  const originalUpdatedAt = new Date(initialSection.updated_at);
  // Step 4: Update the section using super admin privileges
  const updateData: IDiscussionBoardSection.IUpdate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  };
  const updatedSection =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: initialSection.id,
        body: updateData,
      },
    );
  typia.assert(updatedSection);
  // Step 5: Validate the update response
  TestValidator.equals(
    "section ID remains unchanged",
    updatedSection.id,
    initialSection.id,
  );
  TestValidator.equals(
    "name should be updated",
    updatedSection.name,
    updateData.name,
  );
  TestValidator.equals(
    "description should be updated",
    updatedSection.description,
    updateData.description,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedSection.created_at,
    initialSection.created_at,
  );
  TestValidator.notEquals(
    "updated_at should change",
    updatedSection.updated_at,
    initialSection.updated_at,
  );
  TestValidator.predicate(
    "deleted_at should be null",
    updatedSection.deleted_at === null,
  );
  // Step 6: Validate chronological ordering
  const newUpdatedAt = new Date(updatedSection.updated_at);
  TestValidator.predicate(
    "updated_at should be later than original updated_at",
    newUpdatedAt > originalUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at should be later than created_at",
    newUpdatedAt > originalCreatedAt,
  );
}
