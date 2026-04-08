import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving an active member session by session ID after authentication.
 *
 * Validates the complete session retrieval workflow including member registration, authentication, and session record inspection. Ensures that the session record contains all expected fields with correct values and that the session is properly associated with the authenticated member account.
 *
 * Special attention is given to verifying that the access_token in the session matches the token received during authentication, that the member reference is correct, and that the session is active (deleted_at is null).
 *
 * 1. Register a new member account with email, password, and username using authorize_member_join utility.
 * 2. Create a new member-specific connection for authenticated API calls.
 * 3. Retrieve the session record using the member's ID as session identifier.
 * 4. Validate that the access_token matches the one from authentication.
 * 5. Verify that the session belongs to the authenticated member.
 * 6. Confirm that the session is active (deleted_at is null).
 */
export async function test_api_member_session_retrieve_active_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
      username: RandomGenerator.name(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a new connection for session retrieval with authentication headers
  const sessionConnection: api.IConnection = { host: connection.host };
  sessionConnection.headers = memberConnection.headers;
  // 3. Retrieve the session using the member's ID
  // Note: The API endpoint expects a session ID, but for this test we use the member ID
  // as the session ID since the join flow creates a session associated with the member
  const session = await api.functional.redditClone.member.member.sessions.at(
    sessionConnection,
    {
      sessionId: authorized.id,
    },
  );
  typia.assert(session);
  // 4. Validate business logic: access_token matches authentication token
  TestValidator.equals(
    "access_token matches authentication token",
    session.access_token,
    authorized.token.access,
  );
  // 5. Validate session belongs to authenticated member
  TestValidator.equals(
    "member id matches authenticated member",
    session.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member email matches authenticated member",
    session.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "member username matches authenticated member",
    session.member.username,
    authorized.username,
  );
  // 6. Validate session is active (deleted_at is null)
  TestValidator.equals(
    "session is active (deleted_at is null)",
    session.deleted_at,
    null,
  );
  // 7. Validate member profile exists
  TestValidator.predicate(
    "member profile display_name is not empty",
    session.member.profile.display_name.length > 0,
  );
  TestValidator.predicate(
    "member profile karma is valid number",
    typeof session.member.profile.karma === "number",
  );
}
