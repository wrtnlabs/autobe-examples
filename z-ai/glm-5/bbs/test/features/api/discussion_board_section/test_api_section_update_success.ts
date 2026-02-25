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

export async function test_api_section_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_user_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a section
  const section = await generate_random_discussion_board_user_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // Store original creator info
  const originalCreator = section.creator;
  const originalCreatedAt = section.created_at;
  // 3. Update the section
  const updateData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IDiscussionBoardSection.IUpdate;
  const updatedSection =
    await api.functional.discussionBoard.user.sections.update(adminConnection, {
      sectionId: section.id,
      body: updateData,
    });
  typia.assert(updatedSection);
  // 4. Validate updated values
  TestValidator.equals("name updated", updatedSection.name, updateData.name);
  TestValidator.equals(
    "description updated",
    updatedSection.description,
    updateData.description,
  );
  // Validate modifier is populated with current administrator
  TestValidator.predicate("modifier exists", updatedSection.modifier !== null);
  typia.assertGuard(updatedSection.modifier!);
  TestValidator.equals(
    "modifier id matches admin",
    updatedSection.modifier.id,
    admin.id,
  );
  TestValidator.equals(
    "modifier displayName matches",
    updatedSection.modifier.displayName,
    admin.displayName,
  );
  TestValidator.equals(
    "modifier email matches",
    updatedSection.modifier.email,
    admin.email,
  );
  // Validate creator remains unchanged
  TestValidator.equals(
    "creator unchanged",
    updatedSection.creator.id,
    originalCreator.id,
  );
  TestValidator.equals(
    "creator displayName unchanged",
    updatedSection.creator.displayName,
    originalCreator.displayName,
  );
  TestValidator.equals(
    "creator email unchanged",
    updatedSection.creator.email,
    originalCreator.email,
  );
  // Validate timestamps
  TestValidator.equals(
    "created_at unchanged",
    updatedSection.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at is recent",
    new Date(updatedSection.updated_at).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
}
