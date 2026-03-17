import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
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
 * Test that requesting a non-existent session returns 404 Not Found.
 *
 * This test verifies the error handling behavior when attempting to retrieve
 * a session that does not exist in the system. The system should return a
 * 404 status code rather than 401 (which would indicate an expired session).
 *
 * Test Flow:
 * 1. Register and authenticate as a member
 * 2. Generate a random UUID that doesn't correspond to any existing session
 * 3. Attempt to retrieve the non-existent session
 * 4. Verify 404 Not Found error is returned
 */
export async function test_api_session_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a random UUID that does not exist in the system
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify that requesting non-existent session returns 404
  await TestValidator.httpError(
    "should return 404 for non-existent session",
    404,
    async () => {
      await api.functional.communityPlatform.member.sessions.at(
        memberConnection,
        {
          sessionId: nonExistentSessionId,
        },
      );
    },
  );
}
