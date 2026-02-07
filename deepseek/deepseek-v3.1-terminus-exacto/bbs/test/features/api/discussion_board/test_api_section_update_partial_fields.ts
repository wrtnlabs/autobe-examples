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

export async function test_api_section_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create initial section
  const initialSection =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(initialSection);
  // Store initial timestamp for comparison
  const initialUpdatedAt = initialSection.updated_at;
  // Test 1: Update only name field
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const sectionAfterNameUpdate =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: initialSection.id,
        body: {
          name: updatedName,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(sectionAfterNameUpdate);
  TestValidator.equals(
    "name should be updated",
    sectionAfterNameUpdate.name,
    updatedName,
  );
  TestValidator.equals(
    "description should remain unchanged",
    sectionAfterNameUpdate.description,
    initialSection.description,
  );
  TestValidator.equals(
    "display_order should remain unchanged",
    sectionAfterNameUpdate.display_order,
    initialSection.display_order,
  );
  TestValidator.equals(
    "status should remain active",
    sectionAfterNameUpdate.status,
    "active",
  );
  TestValidator.notEquals(
    "updated_at should change after name update",
    sectionAfterNameUpdate.updated_at,
    initialUpdatedAt,
  );
  // Test 2: Update only description field
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const sectionAfterDescriptionUpdate =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: initialSection.id,
        body: {
          description: updatedDescription,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(sectionAfterDescriptionUpdate);
  TestValidator.equals(
    "name should remain updated",
    sectionAfterDescriptionUpdate.name,
    updatedName,
  );
  TestValidator.equals(
    "description should be updated",
    sectionAfterDescriptionUpdate.description,
    updatedDescription,
  );
  TestValidator.equals(
    "display_order should remain unchanged",
    sectionAfterDescriptionUpdate.display_order,
    initialSection.display_order,
  );
  TestValidator.equals(
    "status should remain active",
    sectionAfterDescriptionUpdate.status,
    "active",
  );
  TestValidator.notEquals(
    "updated_at should change after description update",
    sectionAfterDescriptionUpdate.updated_at,
    sectionAfterNameUpdate.updated_at,
  );
  // Test 3: Update only display_order field
  const updatedDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const sectionAfterOrderUpdate =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: initialSection.id,
        body: {
          display_order: updatedDisplayOrder,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(sectionAfterOrderUpdate);
  TestValidator.equals(
    "name should remain updated",
    sectionAfterOrderUpdate.name,
    updatedName,
  );
  TestValidator.equals(
    "description should remain updated",
    sectionAfterOrderUpdate.description,
    updatedDescription,
  );
  TestValidator.equals(
    "display_order should be updated",
    sectionAfterOrderUpdate.display_order,
    updatedDisplayOrder,
  );
  TestValidator.equals(
    "status should remain active",
    sectionAfterOrderUpdate.status,
    "active",
  );
  TestValidator.notEquals(
    "updated_at should change after display_order update",
    sectionAfterOrderUpdate.updated_at,
    sectionAfterDescriptionUpdate.updated_at,
  );
  // Test 4: Update only status field to inactive
  const sectionAfterStatusUpdate =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: initialSection.id,
        body: {
          status: "inactive",
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(sectionAfterStatusUpdate);
  TestValidator.equals(
    "name should remain updated",
    sectionAfterStatusUpdate.name,
    updatedName,
  );
  TestValidator.equals(
    "description should remain updated",
    sectionAfterStatusUpdate.description,
    updatedDescription,
  );
  TestValidator.equals(
    "display_order should remain updated",
    sectionAfterStatusUpdate.display_order,
    updatedDisplayOrder,
  );
  TestValidator.equals(
    "status should be updated to inactive",
    sectionAfterStatusUpdate.status,
    "inactive",
  );
  TestValidator.notEquals(
    "updated_at should change after status update",
    sectionAfterStatusUpdate.updated_at,
    sectionAfterOrderUpdate.updated_at,
  );
  // Test 5: Update status to archived
  const sectionAfterArchivedUpdate =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: initialSection.id,
        body: {
          status: "archived",
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(sectionAfterArchivedUpdate);
  TestValidator.equals(
    "status should be updated to archived",
    sectionAfterArchivedUpdate.status,
    "archived",
  );
  // Test 6: Update multiple fields simultaneously
  const finalName = RandomGenerator.paragraph({ sentences: 2 });
  const finalDescription = RandomGenerator.paragraph({ sentences: 5 });
  const finalDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const finalSection =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: initialSection.id,
        body: {
          name: finalName,
          description: finalDescription,
          display_order: finalDisplayOrder,
          status: "active",
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(finalSection);
  TestValidator.equals("name should be updated", finalSection.name, finalName);
  TestValidator.equals(
    "description should be updated",
    finalSection.description,
    finalDescription,
  );
  TestValidator.equals(
    "display_order should be updated",
    finalSection.display_order,
    finalDisplayOrder,
  );
  TestValidator.equals(
    "status should be updated to active",
    finalSection.status,
    "active",
  );
  // Verify createdByAdmin relationship is preserved
  TestValidator.equals(
    "createdByAdmin should remain unchanged",
    finalSection.createdByAdmin.id,
    initialSection.createdByAdmin.id,
  );
}
