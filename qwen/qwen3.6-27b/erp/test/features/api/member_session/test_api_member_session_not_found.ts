import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that retrieving a non-existent member session returns 404 Not Found.
 *
 * Validates the error handling for session lookups when the provided session
 * identifier does not correspond to any existing session record in the system.
 * Ensures the API returns appropriate 404 responses without exposing internal
 * system state or implementation details.
 *
 * 1. Authenticate as a new member by joining the platform.
 * 2. Generate a random non-existent session UUID.
 * 3. Attempt to retrieve the session using the non-existent ID.
 * 4. Validate that the API returns 404 Not Found error.
 */
export async function test_api_member_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a non-existent session ID (random UUID that doesn't exist in DB)
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // 3 & 4. Attempt to retrieve session and validate 404 response
  await TestValidator.httpError(
    "non-existent session returns 404",
    404,
    async () => {
      await api.functional.hrmPlatform.member.sessions.at(memberConnection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
