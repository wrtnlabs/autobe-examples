import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieval of a session that does not exist in the system.
   *
   * Validates the behavior when an authenticated member attempts to retrieve a session by an ID that does not exist in the database. Ensures that the system properly returns a 404 Not Found error with appropriate error messaging.
   *
   * Special attention is given to verifying that the system distinguishes between a non-existent session (404) and other error conditions, and that the session existence validation is properly enforced before any access control checks.
   *
   * 1. Member account registration with valid credentials.
   * 2. Generation of a random UUID guaranteed not to exist in the session table.
   * 3. Attempt to retrieve the non-existent session using authenticated member connection.
   * 4. Verification of 404 Not Found status.
   */
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass456!",
      username: "testuser456",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate a random UUID that is guaranteed not to exist
  const nonExistentSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call GET /redditCommunity/member/sessions/{sessionId} with non-existent sessionId
  // Expected to return 404 Not Found
  await TestValidator.httpError(
    "should return 404 for non-existent session",
    404,
    async () => {
      await api.functional.redditCommunity.member.sessions.at(
        memberConnection,
        {
          sessionId: nonExistentSessionId,
        },
      );
    },
  );
}
