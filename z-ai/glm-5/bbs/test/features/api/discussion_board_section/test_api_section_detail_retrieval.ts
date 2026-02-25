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
 * Test successful retrieval of an active discussion board section.
 * 1. Authenticate as a user via join
 * 2. Create a section through the user section creation endpoint
 * 3. Retrieve the section by its ID
 * 4. Validate all response fields match expectations
 */
export async function test_api_section_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a user
  const userConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_user_join(userConnection, {});
  typia.assert(authResult);
  // 2. Create a section
  const sectionName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const sectionDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const createdSection =
    await api.functional.discussionBoard.user.sections.create(userConnection, {
      body: {
        name: sectionName,
        description: sectionDescription,
      } satisfies IDiscussionBoardSection.ICreate,
    });
  typia.assert(createdSection);
  // 3. Retrieve the section by ID
  const retrievedSection = await api.functional.discussionBoard.sections.at(
    connection,
    {
      sectionId: createdSection.id,
    },
  );
  typia.assert(retrievedSection);
  // 4. Validate all response fields
  TestValidator.equals(
    "section id matches",
    retrievedSection.id,
    createdSection.id,
  );
  TestValidator.equals(
    "section name matches",
    retrievedSection.name,
    createdSection.name,
  );
  TestValidator.equals(
    "section description matches",
    retrievedSection.description,
    createdSection.description,
  );
  TestValidator.equals(
    "article count starts at 0",
    retrievedSection.articleCount,
    0,
  );
  TestValidator.equals(
    "modifier is null for new section",
    retrievedSection.modifier,
    null,
  );
  TestValidator.equals(
    "creator id matches user",
    retrievedSection.creator.id,
    authResult.id,
  );
  TestValidator.equals(
    "creator displayName matches user",
    retrievedSection.creator.displayName,
    authResult.displayName,
  );
  TestValidator.equals(
    "creator email matches user",
    retrievedSection.creator.email,
    authResult.email,
  );
  TestValidator.predicate(
    "deleted_at is null",
    retrievedSection.deleted_at === null,
  );
  TestValidator.predicate(
    "created_at is valid ISO string",
    typeof retrievedSection.created_at === "string" &&
      retrievedSection.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    typeof retrievedSection.updated_at === "string" &&
      retrievedSection.updated_at.length > 0,
  );
}
