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
 * Test that an authenticated administrator can successfully create a new discussion board section.
 * The scenario validates the primary success path where a regular or super administrator provides
 * a valid section name and optional description, and the system creates the section with proper
 * metadata including creator reference, timestamps, and unique identifier.
 */
export async function test_api_admin_section_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and register as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create section with valid name and optional description
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Validate section structure and content
  TestValidator.equals(
    "section id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      section.id,
    ),
    true,
  );
  TestValidator.equals(
    "section name matches input",
    section.name,
    section.name,
  );
  TestValidator.predicate(
    "section has description",
    section.description !== null,
  );
  TestValidator.equals(
    "creator id matches admin id",
    section.creator.id,
    admin.id,
  );
  TestValidator.equals(
    "creator email matches admin email",
    section.creator.email,
    admin.email,
  );
  TestValidator.equals(
    "creator display name matches admin display name",
    section.creator.display_name,
    admin.display_name,
  );
  TestValidator.predicate(
    "creator grade is valid",
    section.creator.grade === "regular" || section.creator.grade === "super",
  );
  TestValidator.predicate(
    "articles count is non-negative",
    section.articles_count >= 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      section.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      section.updated_at,
    ),
  );
  TestValidator.equals(
    "deleted_at is null for active section",
    section.deleted_at,
    null,
  );
}
