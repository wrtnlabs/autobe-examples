import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
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
import { generate_random_discussion_board_super_admin_sections_snapshots_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_snapshots_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_snapshot_creation_for_compliance_audit(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a section to capture snapshot of
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
  // Create a snapshot of the section
  const snapshot =
    await generate_random_discussion_board_super_admin_sections_snapshots_create(
      superAdminConnection,
      {
        params: {
          sectionId: section.id,
        },
        body: {
          name: section.name,
          description: section.description,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot preserves section configuration
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
  // Validate snapshot contains creation timestamp
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.created_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot timestamp is valid date",
    !isNaN(new Date(snapshot.created_at).getTime()),
  );
  // Validate snapshot includes parent section summary for audit trail
  TestValidator.equals(
    "parent section id matches",
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
    "parent section has creation timestamp",
    snapshot.section.created_at !== undefined,
  );
}
