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
 * Test the primary success path for administrator section creation.
 * An authenticated administrator creates a new discussion board section
 * by providing a unique section name and a descriptive description.
 * The system should validate the input, ensure the section name is unique,
 * record the administrator as the creator, set appropriate timestamps,
 * and return the complete created section object with all fields including
 * auto-generated UUID id, creator information, and null deleted_at value.
 * Verify that the section is immediately available for all users to browse
 * and that articles can be assigned to this new section.
 */
export async function test_api_section_creation_with_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
      grade: RandomGenerator.pick(["regular", "super"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Prepare section input
  const sectionName = RandomGenerator.name(3);
  const sectionDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  // 3. Create section with name and description
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: sectionName,
        description: sectionDescription,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 4. Validate business logic - input data preserved in output
  TestValidator.equals("section name matches input", section.name, sectionName);
  TestValidator.equals(
    "section description matches input",
    section.description,
    sectionDescription,
  );
  // 5. Validate creator attribution
  TestValidator.equals(
    "creator id matches authenticated admin",
    section.creator.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "creator display_name matches authenticated admin",
    section.creator.display_name,
    adminAuth.display_name,
  );
  // 6. Verify timestamps are set and valid
  TestValidator.predicate("created_at is set", section.created_at.length > 0);
  TestValidator.predicate("updated_at is set", section.updated_at.length > 0);
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    !isNaN(Date.parse(section.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    !isNaN(Date.parse(section.updated_at)),
  );
  // 7. Verify section is active (not deleted)
  TestValidator.equals(
    "section is active (deleted_at is null)",
    section.deleted_at,
    null,
  );
}
