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

export async function test_api_section_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create initial section
  const originalSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(originalSection);
  // 3. Update section with new name and description
  const newName = RandomGenerator.name(2);
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
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
  // 4. Validate updated section
  TestValidator.equals(
    "section id unchanged",
    updatedSection.id,
    originalSection.id,
  );
  TestValidator.equals("section name updated", updatedSection.name, newName);
  TestValidator.equals(
    "section description updated",
    updatedSection.description,
    newDescription,
  );
  TestValidator.predicate("creator exists", updatedSection.creator !== null);
  TestValidator.predicate(
    "has valid created_at",
    updatedSection.created_at !== null,
  );
  TestValidator.predicate(
    "has valid updated_at",
    updatedSection.updated_at !== null,
  );
  TestValidator.predicate(
    "not soft-deleted",
    updatedSection.deleted_at === null,
  );
  TestValidator.predicate(
    "articles_count is non-negative",
    updatedSection.articles_count >= 0,
  );
  // 5. Test name uniqueness - try to update to existing name (should fail)
  const anotherSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(anotherSection);
  await TestValidator.httpError(
    "duplicate section name should fail",
    409,
    async () => {
      await api.functional.discussionBoard.admin.sections.update(
        adminConnection,
        {
          sectionId: originalSection.id,
          body: {
            name: anotherSection.name, // This name already exists
          } satisfies IDiscussionBoardSection.IUpdate,
        },
      );
    },
  );
}
