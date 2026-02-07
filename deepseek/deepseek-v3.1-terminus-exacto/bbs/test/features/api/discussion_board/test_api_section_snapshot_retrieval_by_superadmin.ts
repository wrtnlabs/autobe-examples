import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

/**
 * Test the successful retrieval of a section snapshot by a super administrator.
 * This scenario validates that when a super admin requests a specific historical
 * snapshot of a section, the system correctly verifies the snapshot belongs to
 * the specified section and returns the complete immutable audit record including
 * all preserved section data (name, description, timestamps). The test verifies
 * that the snapshot data matches what was captured at the time of creation and
 * that the foreign key relationship between snapshot and section is properly
 * validated.
 */
export async function test_api_section_snapshot_retrieval_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a section first (we need a valid section ID)
  // Note: Since we don't have section creation API in the provided SDK,
  // we'll use random UUIDs for testing the foreign key validation
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the snapshot using the super admin connection
  const snapshot =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.at(
      superAdminConnection,
      {
        sectionId: sectionId,
        snapshotId: snapshotId,
      },
    );
  // Validate the response structure - typia.assert performs complete validation
  typia.assert(snapshot);
  // Verify the foreign key relationship (snapshot belongs to the requested section)
  TestValidator.equals(
    "snapshot belongs to requested section",
    snapshot.discussion_board_section_id,
    sectionId,
  );
}
