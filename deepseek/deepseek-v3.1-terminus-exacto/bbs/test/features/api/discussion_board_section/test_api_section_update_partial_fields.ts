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

export async function test_api_section_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
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
  // 2. Create initial section
  const originalSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(originalSection);
  // 3. Test 1: Update name only
  const newName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedNameOnly =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: originalSection.id,
        body: {
          name: newName,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedNameOnly);
  TestValidator.equals(
    "description unchanged after name update",
    updatedNameOnly.description,
    originalSection.description,
  );
  TestValidator.equals(
    "status unchanged after name update",
    updatedNameOnly.status,
    originalSection.status,
  );
  TestValidator.equals(
    "display_order unchanged after name update",
    updatedNameOnly.display_order,
    originalSection.display_order,
  );
  TestValidator.notEquals(
    "name changed after name update",
    updatedNameOnly.name,
    originalSection.name,
  );
  // 4. Test 2: Update description only
  const newDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedDescriptionOnly =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: originalSection.id,
        body: {
          description: newDescription,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedDescriptionOnly);
  TestValidator.equals(
    "name unchanged after description update",
    updatedDescriptionOnly.name,
    updatedNameOnly.name,
  );
  TestValidator.equals(
    "status unchanged after description update",
    updatedDescriptionOnly.status,
    originalSection.status,
  );
  TestValidator.equals(
    "display_order unchanged after description update",
    updatedDescriptionOnly.display_order,
    originalSection.display_order,
  );
  TestValidator.notEquals(
    "description changed after description update",
    updatedDescriptionOnly.description,
    originalSection.description,
  );
  // 5. Test 3: Update status only
  const newStatus = "inactive";
  const updatedStatusOnly =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: originalSection.id,
        body: {
          status: newStatus,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedStatusOnly);
  TestValidator.equals(
    "name unchanged after status update",
    updatedStatusOnly.name,
    updatedDescriptionOnly.name,
  );
  TestValidator.equals(
    "description unchanged after status update",
    updatedStatusOnly.description,
    updatedDescriptionOnly.description,
  );
  TestValidator.equals(
    "display_order unchanged after status update",
    updatedStatusOnly.display_order,
    originalSection.display_order,
  );
  TestValidator.notEquals(
    "status changed after status update",
    updatedStatusOnly.status,
    originalSection.status,
  );
}
