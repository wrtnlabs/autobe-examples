import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
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
 * Test retrieval failure scenario when attempting to access a non-existent archive record.
 * 1) Authenticate as superAdmin using authorize_super_admin_join utility.
 * 2) Attempt to retrieve an archive record using a non-existent UUID.
 * 3) Verify system returns 404 Not Found error.
 */
export async function test_api_superadmin_section_archive_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin-specific connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate a random UUID guaranteed not to exist in the system
  const nonExistentArchiveId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test 404 error for non-existent archive record
  await TestValidator.error(
    "should return 404 for non-existent archive",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.archives.at(
        superAdminConnection,
        { archiveId: nonExistentArchiveId },
      );
    },
  );
}
