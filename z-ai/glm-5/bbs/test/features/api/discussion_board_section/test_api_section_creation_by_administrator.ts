import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_sections_create } from "../../../generate/generate_random_discussion_board_user_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test successful section creation by an administrator.
 *
 * This test validates that an authenticated user can create a new discussion
 * board section with a unique name and description. The test verifies that
 * the created section has correct initial values including null modifier,
 * null deleted_at, and zero article count.
 */
export async function test_api_section_creation_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorizedUser);
  // Step 2: Create a new section using the utility function
  const sectionName = RandomGenerator.paragraph({ sentences: 2 });
  const sectionDescription = RandomGenerator.paragraph({ sentences: 5 });
  const section = await generate_random_discussion_board_user_sections_create(
    userConnection,
    {
      body: {
        name: sectionName,
        description: sectionDescription,
      },
    },
  );
  typia.assert(section);
  // Step 3: Validate business logic - input values should match
  TestValidator.equals("section name matches input", section.name, sectionName);
  TestValidator.equals(
    "section description matches input",
    section.description,
    sectionDescription,
  );
  // Step 4: Validate initial state - newly created section
  TestValidator.equals(
    "modifier is null for new section",
    section.modifier,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active section",
    section.deleted_at,
    null,
  );
  TestValidator.equals(
    "article count is zero for new section",
    section.articleCount,
    0,
  );
  // Step 5: Validate creator information matches authenticated user
  TestValidator.equals(
    "creator id matches user id",
    section.creator.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "creator display name matches",
    section.creator.displayName,
    authorizedUser.displayName,
  );
  TestValidator.equals(
    "creator email matches",
    section.creator.email,
    authorizedUser.email,
  );
}
