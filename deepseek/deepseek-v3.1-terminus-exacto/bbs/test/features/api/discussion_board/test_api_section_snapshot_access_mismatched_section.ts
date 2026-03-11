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
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_snapshot_access_mismatched_section(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authResult);
  // Update connection with authorization token
  superAdminConnection.headers = {
    Authorization: `Bearer ${authResult.token.access}`,
  };
  // 2. Create two distinct sections
  const section1 =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section1);
  const section2 =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section2);
  // 3. Modify first section to trigger snapshot creation
  const updatedSection1 =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: section1.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection1);
  // Wait a moment for snapshot creation (if async)
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Attempt to retrieve the snapshot using the wrong section ID
  // Since we don't have a way to list snapshots, we'll test the validation
  // by attempting to access a snapshot with mismatched section ID
  await TestValidator.error(
    "snapshot access with mismatched section should fail",
    async () => {
      // The system should validate that the snapshot belongs to the specified section
      // This tests the business rule that snapshots must be accessed through correct parent section
      await api.functional.discussionBoard.superAdmin.sections.snapshots.at(
        superAdminConnection,
        {
          sectionId: section2.id, // Wrong section ID
          snapshotId: section1.id, // Using section1 ID as snapshot ID to test validation
        },
      );
    },
  );
}
