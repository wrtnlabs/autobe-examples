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

/**
 * Test section status transitions between active, inactive, and archived states.
 * Verify that super administrators can properly change section status and that
 * each status transition follows the expected business rules.
 */
export async function test_api_section_update_status_transitions(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create initial section with active status
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
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
  // Test transition: active → inactive
  const inactiveSection =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          status: "inactive",
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(inactiveSection);
  TestValidator.equals(
    "status should be inactive",
    inactiveSection.status,
    "inactive",
  );
  TestValidator.notEquals(
    "updated_at should change",
    inactiveSection.updated_at,
    section.updated_at,
  );
  // Test transition: inactive → active
  const reactivatedSection =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          status: "active",
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(reactivatedSection);
  TestValidator.equals(
    "status should be active again",
    reactivatedSection.status,
    "active",
  );
  TestValidator.notEquals(
    "updated_at should change again",
    reactivatedSection.updated_at,
    inactiveSection.updated_at,
  );
  // Test transition: active → archived (soft deletion)
  const archivedSection =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          status: "archived",
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(archivedSection);
  TestValidator.equals(
    "status should be archived",
    archivedSection.status,
    "archived",
  );
  TestValidator.notEquals(
    "updated_at should change for archive",
    archivedSection.updated_at,
    reactivatedSection.updated_at,
  );
  // Validate that deleted_at is set for archived sections
  TestValidator.predicate(
    "deleted_at should be set for archived section",
    archivedSection.deleted_at !== null &&
      archivedSection.deleted_at !== undefined,
  );
}
