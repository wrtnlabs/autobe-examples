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

export async function test_api_super_admin_section_deletion_audit_trail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create a test section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Delete the section to generate deletion record
  await api.functional.discussionBoard.superAdmin.sections.erase(
    superAdminConnection,
    {
      sectionId: section.id,
    },
  );
  // Retrieve the deletion audit trail
  const deletionRecord =
    await api.functional.discussionBoard.superAdmin.sections.deletions.invert(
      superAdminConnection,
      {
        sectionId: section.id,
      },
    );
  typia.assert(deletionRecord);
  // Validate business logic: section reference matches
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
  TestValidator.equals(
    "section created_at matches",
    deletionRecord.section.created_at,
    section.created_at,
  );
  // Validate business logic: deletion occurred after section creation
  const sectionCreatedAt = new Date(section.created_at);
  const deletionCreatedAt = new Date(deletionRecord.created_at);
  TestValidator.predicate(
    "deletion occurred after section creation",
    deletionCreatedAt > sectionCreatedAt,
  );
  // Validate business logic: audit trail completeness
  TestValidator.predicate(
    "deletion record has section reference",
    deletionRecord.section !== null,
  );
  TestValidator.predicate(
    "deletion record has administrator reference",
    deletionRecord.deletedByMember !== null,
  );
  TestValidator.predicate(
    "administrator has display name",
    deletionRecord.deletedByMember.display_name.length > 0,
  );
  // Validate governance oversight capabilities
  TestValidator.predicate(
    "deletion record has creation timestamp",
    deletionRecord.created_at !== null,
  );
  TestValidator.predicate(
    "deletion record has update timestamp",
    deletionRecord.updated_at !== null,
  );
  // Validate that the deletion reason field is properly handled (can be null)
  if (deletionRecord.reason !== null) {
    TestValidator.predicate(
      "deletion reason is provided when not null",
      deletionRecord.reason.length > 0,
    );
  }
}
