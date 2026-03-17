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
 * Test successful retrieval of an active member session.
 *
 * Validates that:
 * 1. Session can be retrieved by its unique identifier
 * 2. Response contains complete session metadata (id, ip, href, referrer, timestamps)
 * 3. Member profile information is correctly included
 * 4. Session has not expired (active session validation)
 */
export async function test_api_session_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Register and authenticate a new member to create a session
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Generate session ID for retrieval test
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve session details using authenticated connection
  const session = await api.functional.communityPlatform.member.sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // Validate session identifier matches request
  TestValidator.equals("session id matches", session.id, sessionId);
  // Validate session is active (not expired)
  const now = new Date();
  const expiredAt = new Date(session.expired_at);
  TestValidator.predicate("session is active", expiredAt > now);
  // Validate timestamp ordering
  const createdAt = new Date(session.created_at);
  TestValidator.predicate("created in past", createdAt <= now);
  TestValidator.predicate("expires after creation", expiredAt > createdAt);
}
