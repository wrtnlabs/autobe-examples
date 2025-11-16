import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

/**
 * Validate permanent deletion of a content quarantine record by administrator.
 *
 * This test simulates the workflow where a newly registered administrator
 * permanently deletes a content quarantine record via the
 * /communityPlatform/administrator/contentQuarantines/{contentQuarantineId}
 * endpoint. The process includes creating an admin account, authenticating
 * context, then invoking deletion using a mock UUID for the quarantine record.
 *
 * Steps:
 *
 * 1. Register and authenticate as a new administrator.
 * 2. Simulate a content quarantine record (only its UUID is used here).
 * 3. Issue a DELETE request to the permanent deletion endpoint as admin.
 * 4. Confirm the DELETE completes without error for an authorized admin.
 * 5. Confirm forbidden error if attempted without administrator authentication.
 */
export async function test_api_content_quarantine_record_permanent_deletion_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as administrator
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_status: null,
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // 2. Simulate content quarantine record UUID
  const quarantineId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Authorized deletion attempt (should succeed)
  await api.functional.communityPlatform.administrator.contentQuarantines.erase(
    connection,
    { contentQuarantineId: quarantineId },
  );

  // 4. Revoke admin token for negative/unauthorized test
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "forbid non-admin from deleting quarantine",
    async () => {
      await api.functional.communityPlatform.administrator.contentQuarantines.erase(
        unauthConn,
        { contentQuarantineId: quarantineId },
      );
    },
  );
}
