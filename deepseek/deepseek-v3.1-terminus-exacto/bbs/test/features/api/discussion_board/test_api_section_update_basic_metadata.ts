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

export async function test_api_section_update_basic_metadata(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a section to update
  const originalSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(originalSection);
  // 3. Update section with new metadata
  const newName = RandomGenerator.paragraph({ sentences: 2 });
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedSection =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: originalSection.id,
        body: {
          name: newName,
          description: newDescription,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // 4. Validate response
  TestValidator.equals(
    "section ID unchanged",
    updatedSection.id,
    originalSection.id,
  );
  TestValidator.equals("name updated", updatedSection.name, newName);
  TestValidator.equals(
    "description updated",
    updatedSection.description,
    newDescription,
  );
  TestValidator.equals(
    "creation timestamp preserved",
    updatedSection.created_at,
    originalSection.created_at,
  );
  TestValidator.notEquals(
    "modification timestamp updated",
    updatedSection.updated_at,
    originalSection.updated_at,
  );
  TestValidator.predicate(
    "modification timestamp is newer",
    new Date(updatedSection.updated_at) > new Date(originalSection.updated_at),
  );
  TestValidator.equals(
    "soft deletion status remains null",
    updatedSection.deleted_at,
    null,
  );
}
