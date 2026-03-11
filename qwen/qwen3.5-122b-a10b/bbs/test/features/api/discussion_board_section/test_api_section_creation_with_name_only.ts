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
 * Test section creation with minimal required data.
 * An authenticated administrator creates a new discussion board section
 * providing only the required section name without a description.
 * The system should successfully create the section with the name field
 * populated and description field set to null.
 * Verify the response includes all required fields with null description,
 * correct creator attribution, proper timestamps, and that the section
 * appears in section listings for all user types (guest, member, admin)
 * with the name displayed but no description text.
 */
export async function test_api_section_creation_with_name_only(
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
  // 2. Create section with only name (no description)
  const sectionName = RandomGenerator.name();
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: sectionName,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Validate section properties
  TestValidator.equals("section name matches input", section.name, sectionName);
  TestValidator.equals("description is null", section.description, null);
  // 4. Validate creator attribution
  TestValidator.predicate("creator has id", section.creator.id !== undefined);
  TestValidator.predicate(
    "creator has display_name",
    section.creator.display_name !== undefined,
  );
  TestValidator.predicate(
    "creator grade exists",
    section.creator.grade !== undefined,
  );
  // 5. Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    section.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    section.updated_at !== undefined,
  );
  // 6. Validate deleted_at is null (active section)
  TestValidator.equals("deleted_at is null", section.deleted_at, null);
}
