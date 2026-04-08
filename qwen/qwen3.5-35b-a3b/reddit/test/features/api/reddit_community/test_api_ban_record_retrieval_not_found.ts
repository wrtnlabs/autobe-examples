import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanRecord";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieval of a ban record that does not exist in the system.
 *
 * Validates the system's handling of requests for non-existent ban records by an administrator.
 * The test creates an admin account, attempts to retrieve a ban record with a UUID that was
 * never created in the database, and verifies that the system returns a 404 Not Found response
 * without exposing internal error details.
 *
 * Special attention is given to ensuring that:
 * - The admin account is properly authenticated before making the request
 * - A valid UUID format is used for the non-existent banId
 * - The 404 response is correctly returned when the ban record doesn't exist
 * - No internal error details are exposed in the response
 */
export async function test_api_ban_record_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminResult);
  // 2. adminConnection.headers.Authorization is now set by authorize_admin_join
  // 3. Generate a UUID that is valid format but never existed
  const nonExistentBanId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve non-existent ban record
  // 5. Verify 404 Not Found response
  await TestValidator.httpError(
    "should return 404 for non-existent ban record",
    [404],
    async () => {
      await api.functional.redditCommunity.admin.bans.at(adminConnection, {
        banId: nonExistentBanId,
      });
    },
  );
}
