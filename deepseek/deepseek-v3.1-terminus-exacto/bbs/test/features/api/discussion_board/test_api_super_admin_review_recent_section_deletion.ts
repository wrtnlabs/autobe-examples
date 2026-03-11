import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionDeletion";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_super_admin_review_recent_section_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create a section that will be quickly deleted
  const section =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Immediately delete the section to generate audit record
  await api.functional.discussionBoard.superAdmin.sections.erase(
    superAdminConnection,
    {
      sectionId: section.id,
    },
  );
  // Retrieve the deletion record
  const deletionRecord =
    await api.functional.discussionBoard.superAdmin.sections.deletions.invert(
      superAdminConnection,
      {
        sectionId: section.id,
      },
    );
  typia.assert(deletionRecord);
  // Validate deletion record matches original section
  TestValidator.equals(
    "section ID matches",
    deletionRecord.section.id,
    section.id,
  );
  TestValidator.equals(
    "section name matches",
    deletionRecord.section.name,
    section.name,
  );
  TestValidator.equals(
    "section description matches",
    deletionRecord.section.description,
    section.description,
  );
  // Validate deletion record contains administrator information
  TestValidator.predicate(
    "deletion record has administrator",
    deletionRecord.deletedByMember.id !== undefined,
  );
  TestValidator.predicate(
    "deletion record has timestamp",
    deletionRecord.created_at !== undefined,
  );
  // Validate chronological ordering (deletion should occur after creation)
  const creationTime = new Date(section.created_at).getTime();
  const deletionTime = new Date(deletionRecord.created_at).getTime();
  TestValidator.predicate(
    "deletion occurs after creation",
    deletionTime > creationTime,
  );
}
