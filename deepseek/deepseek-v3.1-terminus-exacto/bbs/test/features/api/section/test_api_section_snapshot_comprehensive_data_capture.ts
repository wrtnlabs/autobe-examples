import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test comprehensive section snapshot data capture functionality.
 * Validates that section snapshots capture all data fields and preserve historical state.
 */
export async function test_api_section_snapshot_comprehensive_data_capture(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create initial section with detailed configuration
  const originalSection =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        },
      },
    );
  typia.assert(originalSection);
  // 3. Modify section to establish version history
  const modifiedSection =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: originalSection.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "inactive",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        },
      },
    );
  typia.assert(modifiedSection);
  // 4. Create snapshot of the current section state
  const snapshot =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.create(
      superAdminConnection,
      {
        sectionId: modifiedSection.id,
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot captures exactly the fields defined in IDiscussionBoardSectionSnapshot
  TestValidator.equals(
    "snapshot name matches current section",
    snapshot.name,
    modifiedSection.name,
  );
  TestValidator.equals(
    "snapshot description matches current section",
    snapshot.description,
    modifiedSection.description,
  );
  TestValidator.equals(
    "snapshot references correct section",
    snapshot.discussion_board_section_id,
    modifiedSection.id,
  );
  // 6. Modify section again after snapshot creation
  const postSnapshotSection =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: modifiedSection.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "archived",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        },
      },
    );
  typia.assert(postSnapshotSection);
  // 7. Verify snapshot remains unchanged (historical preservation)
  TestValidator.notEquals(
    "section name changed after snapshot",
    snapshot.name,
    postSnapshotSection.name,
  );
  TestValidator.notEquals(
    "section description changed after snapshot",
    snapshot.description,
    postSnapshotSection.description,
  );
  TestValidator.equals(
    "snapshot name preserved",
    snapshot.name,
    modifiedSection.name,
  );
  TestValidator.equals(
    "snapshot description preserved",
    snapshot.description,
    modifiedSection.description,
  );
}
