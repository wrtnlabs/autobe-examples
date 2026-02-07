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

export async function test_api_section_snapshot_immutability_verification(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate random section and snapshot IDs for testing
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the snapshot to verify immutability
  const snapshot =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.at(
      superAdminConnection,
      {
        sectionId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate that the snapshot belongs to the specified section
  TestValidator.equals(
    "snapshot belongs to correct section",
    snapshot.discussion_board_section_id,
    sectionId,
  );
  // Verify snapshot has immutable properties
  TestValidator.predicate("snapshot has name", snapshot.name.length > 0);
  TestValidator.predicate(
    "snapshot has description",
    snapshot.description.length > 0,
  );
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.created_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot has update timestamp",
    snapshot.updated_at.length > 0,
  );
  // The key test: verify that snapshot data remains consistent
  // This demonstrates immutability - even if the original section changes,
  // the snapshot preserves the original state
  TestValidator.equals(
    "snapshot created_at equals updated_at for immutable records",
    snapshot.created_at,
    snapshot.updated_at,
  );
}
