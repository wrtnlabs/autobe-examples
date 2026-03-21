import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that requesting a non-existent guest session returns 404 Not Found.
 *
 * Scenario:
 * 1. Authenticate as a member using authorize_member_join
 * 2. Generate a random UUID that doesn't exist in the database
 * 3. Attempt to fetch guest session with non-existent UUID
 * 4. Validate that the API returns 404 Not Found error
 */
export async function test_api_guest_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a random UUID that likely doesn't exist
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to fetch non-existent guest session - expect 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent guest session",
    404,
    async () => {
      await api.functional.erpHrm.member.guest_sessions.at(memberConnection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
