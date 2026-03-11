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

export async function test_api_section_update_description_only(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create initial section with name and description
  const initialSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(initialSection);
  // Update only the description field
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedSection =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: initialSection.id,
        body: {
          description: updatedDescription,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // Validate the response preserves original name
  TestValidator.equals(
    "name should remain unchanged",
    updatedSection.name,
    initialSection.name,
  );
  // Validate the description is updated
  TestValidator.equals(
    "description should be updated",
    updatedSection.description,
    updatedDescription,
  );
  // Validate the modification timestamp is updated
  TestValidator.notEquals(
    "updated_at should change",
    updatedSection.updated_at,
    initialSection.updated_at,
  );
  // Validate other fields remain unchanged
  TestValidator.equals(
    "id should remain unchanged",
    updatedSection.id,
    initialSection.id,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedSection.created_at,
    initialSection.created_at,
  );
  TestValidator.equals(
    "deleted_at should remain null",
    updatedSection.deleted_at,
    null,
  );
  // Validate partial update functionality by testing that name field is optional
  TestValidator.predicate(
    "partial update should work without name field",
    () =>
      !(updatedSection as any).hasOwnProperty("name") ||
      updatedSection.name === initialSection.name,
  );
}
