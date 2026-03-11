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

export async function test_api_section_snapshot_after_modification_tracking(
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
  // Create initial section
  const initialSection =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(initialSection);
  // Modify both section name and description
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 2 });
  const updatedSection =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: initialSection.id,
        body: {
          name: updatedName,
          description: updatedDescription,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // Create snapshot after modification with audit reason
  const snapshot =
    await generate_random_discussion_board_super_admin_sections_snapshots_create(
      superAdminConnection,
      {
        params: {
          sectionId: initialSection.id,
        },
        body: {
          name: updatedSection.name,
          description: updatedSection.description,
          // snapshot_reason not allowed in ICreate type
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot reflects current section state
  TestValidator.equals(
    "snapshot name matches current section",
    snapshot.name,
    updatedSection.name,
  );
  TestValidator.equals(
    "snapshot description matches current section",
    snapshot.description,
    updatedSection.description,
  );
  // Validate snapshot timestamp is after modification using TestValidator
  TestValidator.predicate(
    "snapshot created after modification",
    new Date(snapshot.created_at) >= new Date(updatedSection.updated_at),
  );
  // Validate section reference in snapshot
  TestValidator.equals(
    "snapshot section ID matches",
    snapshot.section.id,
    initialSection.id,
  );
  TestValidator.equals(
    "snapshot section name matches",
    snapshot.section.name,
    updatedSection.name,
  );
  TestValidator.equals(
    "snapshot section description matches",
    snapshot.section.description,
    updatedSection.description,
  );
}
