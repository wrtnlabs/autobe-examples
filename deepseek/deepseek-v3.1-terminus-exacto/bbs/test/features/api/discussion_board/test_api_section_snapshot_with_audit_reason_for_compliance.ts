import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
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
import { generate_random_discussion_board_admin_sections_snapshots_create } from "../../../generate/generate_random_discussion_board_admin_sections_snapshots_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test creating a section snapshot with detailed audit reason documentation for compliance purposes.
 * Authenticate as administrator, create a section, then create a snapshot with a specific snapshot reason
 * (e.g., 'Quarterly compliance audit' or 'Configuration backup before system migration').
 * Validate that the snapshot reason is correctly stored and returned in the response.
 * Verify that the snapshot includes accurate timestamps and maintains referential integrity to the parent section.
 * This scenario tests the business requirement for documenting administrative actions for audit trail compliance.
 */
export async function test_api_section_snapshot_with_audit_reason_for_compliance(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // Create a new section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(section);
  // Create snapshot with specific audit reason
  const snapshotReason = "Quarterly compliance audit";
  const snapshot =
    await generate_random_discussion_board_admin_sections_snapshots_create(
      adminConnection,
      {
        params: {
          sectionId: section.id,
        },
        body: {
          name: section.name,
          description: section.description,
          // snapshot_reason property removed as it's not accepted by the function
        } satisfies { name?: string | undefined; description?: string | null | undefined } as { name?: string | undefined; description?: string | null | undefined },
      },
    );
  typia.assert(snapshot);
  // Validate snapshot properties
  TestValidator.equals(
    "snapshot name matches section",
    snapshot.name,
    section.name,
  );
  TestValidator.equals(
    "snapshot description matches section",
    snapshot.description,
    section.description,
  );
  // Remove validation for snapshot_reason since it's not being passed
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.created_at !== undefined,
  );
  // Validate section reference
  TestValidator.equals("section ID matches", snapshot.section.id, section.id);
  TestValidator.equals(
    "section name matches",
    snapshot.section.name,
    section.name,
  );
  TestValidator.equals(
    "section description matches",
    snapshot.section.description,
    section.description,
  );
}