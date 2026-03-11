import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
 * Test retrieving an existing active section by its UUID identifier.
 *
 * This test validates the section retrieval endpoint by:
 * 1. Registering an administrator account
 * 2. Creating a new section with unique name and description
 * 3. Retrieving the section using its generated UUID
 * 4. Validating all response fields including id, name, description,
 *    timestamps, deleted_at (null for active), and articles_count
 * 5. Verifying the retrieved section matches the created section
 */
export async function test_api_section_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a new section with unique name and description
  const sectionName = RandomGenerator.paragraph({ sentences: 1 });
  const sectionDescription = RandomGenerator.paragraph({ sentences: 3 });
  const createdSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: sectionName,
          description: sectionDescription,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(createdSection);
  // 3. Retrieve the section using its UUID
  const retrievedSection = await api.functional.discussionBoard.sections.at(
    connection,
    {
      sectionId: createdSection.id,
    },
  );
  typia.assert(retrievedSection);
  // 4. Validate section structure and content
  TestValidator.equals(
    "section id matches",
    retrievedSection.id,
    createdSection.id,
  );
  TestValidator.equals(
    "section name matches",
    retrievedSection.name,
    sectionName,
  );
  TestValidator.equals(
    "section description matches",
    retrievedSection.description,
    sectionDescription,
  );
  TestValidator.predicate(
    "section is active (deleted_at is null)",
    retrievedSection.deleted_at === null,
  );
  TestValidator.predicate(
    "articles_count is non-negative",
    retrievedSection.articles_count >= 0,
  );
}
