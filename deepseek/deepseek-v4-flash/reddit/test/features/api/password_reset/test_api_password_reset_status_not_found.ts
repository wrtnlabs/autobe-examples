import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a non-existent password reset ID returns 404 Not Found.
 *
 * This test validates the error handling of the password reset status endpoint when queried with a UUID that does not correspond to any existing password reset record. The endpoint is designed to be accessible without authentication (guests who received a password reset link must be able to check its status), so the test uses a fresh connection without any authorization header.
 *
 * 1. Create a member account via join (prerequisite dependency).
 * 2. Generate a random UUID that does not map to any existing password reset record.
 * 3. Create a guest connection (no auth header).
 * 4. Query the password reset status endpoint with the random UUID.
 * 5. Verify that an HTTP 404 error is thrown.
 */
export async function test_api_password_reset_status_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account (prerequisite dependency)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a random UUID that does not exist in the password resets table
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Use a fresh connection without any auth header (endpoint requires no authentication)
  const guestConnection: api.IConnection = { host: connection.host };
  // 4-5. Verify that a non-existent resetId returns 404 Not Found
  await TestValidator.httpError(
    "password reset status not found",
    404,
    async () => {
      await api.functional.communityPlatform.member.password_resets.at(
        guestConnection,
        { resetId },
      );
    },
  );
}
