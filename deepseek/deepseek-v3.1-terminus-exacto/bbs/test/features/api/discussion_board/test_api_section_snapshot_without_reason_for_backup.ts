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

export async function test_api_section_snapshot_without_reason_for_backup(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create section with comprehensive metadata
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
  // 3. Create snapshot without reason field
  const snapshot =
    await generate_random_discussion_board_super_admin_sections_snapshots_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot properties
  TestValidator.equals(
    "snapshot reason should be null",
    snapshot.snapshot_reason,
    null,
  );
  TestValidator.equals(
    "snapshot section id should match",
    snapshot.section.id,
    section.id,
  );
  TestValidator.equals(
    "snapshot section name should match",
    snapshot.section.name,
    section.name,
  );
  TestValidator.equals(
    "snapshot section description should match",
    snapshot.section.description,
    section.description,
  );
  TestValidator.predicate(
    "snapshot should have valid creation timestamp",
    () => new Date(snapshot.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "snapshot should be created after section",
    () => new Date(snapshot.created_at) > new Date(section.created_at),
  );
}
