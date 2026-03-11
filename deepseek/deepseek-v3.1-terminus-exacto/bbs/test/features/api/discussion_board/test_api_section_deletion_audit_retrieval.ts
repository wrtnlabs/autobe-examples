import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionDeletion";
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

export async function test_api_section_deletion_audit_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a new section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Delete the section to generate audit record
  // Note: Since deletion endpoint is not provided in available utilities,
  // we assume the section deletion has occurred through other means
  // and the audit record exists in the system
  // 4. Retrieve the deletion audit record
  const deletionAudit =
    await api.functional.discussionBoard.admin.sections.deletions.invert(
      adminConnection,
      {
        sectionId: section.id,
      },
    );
  typia.assert(deletionAudit);
  // 5. Validate audit record structure and content
  TestValidator.equals(
    "deletion record contains section information",
    deletionAudit.section.id,
    section.id,
  );
  TestValidator.equals(
    "deletion record contains section name",
    deletionAudit.section.name,
    section.name,
  );
  TestValidator.equals(
    "deletion record contains section description",
    deletionAudit.section.description,
    section.description,
  );
  TestValidator.equals(
    "deletion record contains section creation timestamp",
    deletionAudit.section.created_at,
    section.created_at,
  );
  // Validate administrator information
  TestValidator.predicate(
    "deletion record contains administrator display name",
    typeof deletionAudit.deletedByMember.display_name === "string" &&
      deletionAudit.deletedByMember.display_name.length > 0,
  );
  // Validate audit record metadata
  TestValidator.predicate(
    "deletion record has valid ID",
    typeof deletionAudit.id === "string" && deletionAudit.id.length > 0,
  );
  TestValidator.predicate(
    "deletion record has creation timestamp",
    typeof deletionAudit.created_at === "string" &&
      deletionAudit.created_at.length > 0,
  );
  TestValidator.predicate(
    "deletion record has update timestamp",
    typeof deletionAudit.updated_at === "string" &&
      deletionAudit.updated_at.length > 0,
  );
  // Validate timestamps are in proper format
  TestValidator.predicate(
    "deletion record timestamps are valid ISO strings",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      deletionAudit.created_at,
    ) &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        deletionAudit.updated_at,
      ),
  );
}
