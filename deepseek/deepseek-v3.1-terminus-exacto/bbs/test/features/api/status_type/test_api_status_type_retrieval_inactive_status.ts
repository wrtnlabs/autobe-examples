import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
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
 * Test retrieval of an inactive (soft-deleted) status type by a super administrator.
 * The scenario authenticates as superAdmin, creates a status type record, then marks it as inactive/deleted,
 * then attempts to retrieve it. Validate that the system properly handles inactive status types.
 * Since we cannot create status types via API, we test with a random UUID expecting an error response.
 */
export async function test_api_status_type_retrieval_inactive_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate a random UUID to simulate an inactive/deleted status type ID
  const randomStatusTypeId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the inactive status type and expect an error response
  await TestValidator.httpError(
    "retrieving inactive status type should return error",
    404,
    async () => {
      await api.functional.discussionBoard.superAdmin.status_types.at(
        superAdminConnection,
        {
          statusTypeId: randomStatusTypeId,
        },
      );
    },
  );
  // Additional validation: ensure the error is indeed for not found
  // (TestValidator.httpError already validates status code)
}
