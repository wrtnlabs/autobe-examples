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
 * Test member session self-retrieval endpoint validates that authenticated members can access their own session details.
 *
 * This test creates a new member account using the authorize_member_join utility function, which authenticates the member and establishes a valid session with JWT tokens. Then retrieves the session using the session ID from the authorization response to verify the session metadata structure and contents.
 *
 * 1. Member creates account with email, password, and display_name to establish authentication context
 * 2. Member retrieves their own session details using the session ID from authorization response
 * 3. Validated session metadata includes all required fields: id (UUID), ip (IPv4), href (URI), referrer (URI), author (member summary), created_at (datetime), and expired_at (datetime)
 * 4. Verifies the author in the session matches the authenticated member's profile
 */
export async function test_api_member_session_self_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create a new member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as a new member using the utility function
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // Validate the authorization response structure and fields
  typia.assert(authorizedMember);
  // Retrieve the member's own session using the session ID from authorization
  const session = await api.functional.hrmPlatform.member.sessions.at(
    memberConnection,
    {
      sessionId: authorizedMember.id,
    },
  );
  // Validate the session response structure and required fields
  typia.assert(session);
  // Verify session contains all expected metadata fields
  TestValidator.equals(
    "session has valid UUID",
    session.id !== undefined,
    true,
  );
  TestValidator.equals(
    "session has IP address",
    session.ip !== undefined,
    true,
  );
  TestValidator.equals(
    "session has href URL",
    session.href !== undefined,
    true,
  );
  TestValidator.equals(
    "session has referrer",
    session.referrer !== undefined,
    true,
  );
  TestValidator.equals(
    "session has author",
    session.author !== undefined,
    true,
  );
  TestValidator.equals(
    "session has created_at timestamp",
    session.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "session has expired_at timestamp",
    session.expired_at !== undefined,
    true,
  );
  // Verify the author in the session matches the authenticated member's profile
  TestValidator.equals(
    "author email matches authenticated member",
    session.author.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "author display name matches authenticated member",
    session.author.display_name,
    authorizedMember.display_name,
  );
}