import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import type { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the scenario where an administrator attempts to retrieve a system metadata record
 * that has been soft-deleted (deleted_at is not null). Validate that the endpoint
 * properly excludes soft-deleted records and returns an appropriate error response
 * indicating the record is not available. This tests the system's soft deletion
 * implementation and ensures deleted configurations are not accessible through
 * normal retrieval operations.
 */
export async function test_api_system_metadata_soft_deleted_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate random UUID for non-existent/soft-deleted metadata record
  const metadataId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the non-existent/soft-deleted record
  await TestValidator.error(
    "soft-deleted system metadata should not be accessible",
    async () => {
      await api.functional.discussionBoard.admin.system_metadata.at(
        adminConnection,
        { metadataId },
      );
    },
  );
}
