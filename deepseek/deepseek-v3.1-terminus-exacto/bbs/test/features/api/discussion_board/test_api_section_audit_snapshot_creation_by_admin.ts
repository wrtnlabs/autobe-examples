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
 * Test that an administrator can create an audit snapshot of an existing section for compliance tracking.
 * 1. Administrator authenticates via admin registration
 * 2. Administrator creates a new section with unique name
 * 3. Administrator creates a snapshot of that section configuration
 * 4. Validate snapshot includes captured section name, description, creation timestamp, and references parent section
 */
export async function test_api_section_audit_snapshot_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a section to take snapshot of
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Create snapshot of the section using utility function with proper parameters
  const snapshot =
    await generate_random_discussion_board_admin_sections_snapshots_create(
      adminConnection,
      {
        params: {
          sectionId: section.id,
        },
        // Let the utility function generate appropriate random data for the snapshot
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot properties
  TestValidator.equals(
    "snapshot name matches section name",
    snapshot.name,
    section.name,
  );
  TestValidator.equals(
    "snapshot description matches section description",
    snapshot.description,
    section.description,
  );
  TestValidator.predicate(
    "snapshot has valid UUID",
    typia.is<string & tags.Format<"uuid">>(snapshot.id),
  );
  TestValidator.predicate(
    "snapshot has valid creation timestamp",
    typia.is<string & tags.Format<"date-time">>(snapshot.created_at),
  );
  // 5. Validate parent section reference
  TestValidator.equals(
    "parent section ID matches",
    snapshot.section.id,
    section.id,
  );
  TestValidator.equals(
    "parent section name matches",
    snapshot.section.name,
    section.name,
  );
  TestValidator.equals(
    "parent section description matches",
    snapshot.section.description,
    section.description,
  );
  TestValidator.predicate(
    "parent section has valid creation timestamp",
    typia.is<string & tags.Format<"date-time">>(snapshot.section.created_at),
  );
}
