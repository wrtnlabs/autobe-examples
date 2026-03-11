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

export async function test_api_section_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      grade: RandomGenerator.pick(["regular", "super"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Retrieve the section
  const retrieved = await api.functional.discussionBoard.admin.sections.at(
    adminConnection,
    {
      sectionId: section.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate response fields
  TestValidator.equals("section id matches", retrieved.id, section.id);
  TestValidator.equals("section name matches", retrieved.name, section.name);
  TestValidator.equals(
    "section description matches",
    retrieved.description,
    section.description,
  );
  TestValidator.predicate(
    "created_at is ISO 8601 format",
    /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/.test(retrieved.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 format",
    /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/.test(retrieved.updated_at),
  );
  TestValidator.equals(
    "deleted_at is null for active section",
    retrieved.deleted_at,
    null,
  );
  // 5. Verify creator information
  TestValidator.equals(
    "creator id matches admin id",
    retrieved.creator.id,
    admin.id,
  );
  TestValidator.equals(
    "creator display_name matches admin display_name",
    retrieved.creator.display_name,
    admin.display_name,
  );
  TestValidator.equals(
    "creator grade matches admin grade",
    retrieved.creator.grade,
    admin.grade,
  );
}
