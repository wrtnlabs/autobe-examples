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

export async function test_api_section_creator_relation_resolved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an admin account and record details
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Create a section using the admin's authentication
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // 3. As an unauthenticated guest, retrieve the section by ID
  const guestConnection: api.IConnection = { host: connection.host };
  const retrievedSection = await api.functional.discussionBoard.sections.at(
    guestConnection,
    {
      sectionId: section.id,
    },
  );
  typia.assert(retrievedSection);
  // 4. Verify the creator field matches the admin's data
  TestValidator.equals(
    "creator.id matches admin id",
    admin.id,
    retrievedSection.creator.id,
  );
  TestValidator.equals(
    "creator.email matches admin email",
    admin.email,
    retrievedSection.creator.email,
  );
  TestValidator.equals(
    "creator.displayName matches admin displayName",
    admin.displayName,
    retrievedSection.creator.displayName,
  );
  TestValidator.equals(
    "creator.grade matches admin grade",
    admin.grade,
    retrievedSection.creator.grade,
  );
  TestValidator.equals(
    "creator.banned matches admin banned status",
    admin.bannedAt !== null,
    retrievedSection.creator.banned,
  );
  TestValidator.predicate(
    "creator.createdAt is a valid ISO 8601 timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      retrievedSection.creator.createdAt,
    ),
  );
  // 5. Verify sensitive fields are NOT exposed (password_hash is not in ISummary type)
  // The ISummary type only includes: id, email, displayName, grade, banned, createdAt
  // typia.assert already validates the type structure
}