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

export async function test_api_section_update_description_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and gets authorized
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Admin creates a section with initial name and description
  const initialName = RandomGenerator.paragraph({ sentences: 1 }).trim();
  const initialDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  }).trim();
  // Create a new section with initial data
  const sectionBefore =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          name: initialName,
          description: initialDescription,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(sectionBefore);
  // 3. Verify initial state
  TestValidator.equals("initial name matches", sectionBefore.name, initialName);
  TestValidator.equals(
    "initial description matches",
    sectionBefore.description,
    initialDescription,
  );
  const initialCreatedAt = sectionBefore.created_at;
  // 4. Update with only a new description (no name change)
  const newDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  }).trim();
  const sectionAfter =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: sectionBefore.id,
        body: {
          description: newDescription,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(sectionAfter);
  // 5. Verify that the section name remains the original value
  TestValidator.equals(
    "name remains unchanged",
    sectionAfter.name,
    initialName,
  );
  // 6. Verify that the description field is updated to the new value
  TestValidator.equals(
    "description updated to new value",
    sectionAfter.description,
    newDescription,
  );
  // 7. Verify that the creation timestamp remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    sectionAfter.created_at,
    initialCreatedAt,
  );
}
