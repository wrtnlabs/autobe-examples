import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

export async function test_api_member_session_delete_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account through registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(8);
  const memberPassword = "TestPassword123!@#";

  const createdMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(createdMember);
  typia.assert(createdMember.token);

  // Step 2: Verify the member is authenticated
  TestValidator.predicate(
    "member authentication token should be provided",
    createdMember.token.access.length > 0,
  );

  // Step 3: Generate a test session ID (simulating an active session)
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Delete the session using the session ID
  const deletedSession =
    await api.functional.communityPlatform.member.auth.member.sessions.erase(
      connection,
      {
        sessionId: sessionId,
      },
    );
  typia.assert(deletedSession);

  // Step 5: Verify the session deletion response structure
  TestValidator.predicate(
    "deleted session should have a valid ID",
    deletedSession.id.length > 0,
  );

  // Step 6: Verify the session has been marked as expired
  TestValidator.predicate(
    "deleted session should have expired_at timestamp set",
    deletedSession.expired_at !== null &&
      deletedSession.expired_at !== undefined,
  );

  // Step 7: Verify session member reference is present
  TestValidator.predicate(
    "deleted session should have member reference",
    deletedSession.member !== null && deletedSession.member !== undefined,
  );

  // Step 8: Verify the session href is a valid URI
  TestValidator.predicate(
    "deleted session href should be a valid URI",
    deletedSession.href.length > 0,
  );
}
