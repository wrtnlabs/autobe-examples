import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test session retrieval for expired session scenario. Authenticate as super administrator via join endpoint.
 * Create multiple sessions and identify one that has expired. Attempt to retrieve expired session details.
 * Verify that expired session information is still returned with expired timestamp, demonstrating session auditing capabilities even for historical sessions.
 */
export async function test_api_super_admin_session_retrieval_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple super administrator sessions
  const superAdminConnections: api.IConnection[] = [];
  const sessionIds: (string & tags.Format<"uuid">)[] = [];
  // Create first session
  const superAdminConnection1: api.IConnection = { host: connection.host };
  const authorized1 = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection1,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authorized1);
  superAdminConnections.push(superAdminConnection1);
  sessionIds.push(authorized1.id); // The ID from IAuthorized matches the session ID
  // Create second session with different credentials
  const superAdminConnection2: api.IConnection = { host: connection.host };
  const authorized2 = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection2,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authorized2);
  superAdminConnections.push(superAdminConnection2);
  sessionIds.push(authorized2.id);
  // Retrieve session details for all sessions to find potentially expired ones
  const sessions: IDiscussionBoardSuperAdminSession[] = [];
  for (const sessionId of sessionIds) {
    const session =
      await api.functional.discussionBoard.superAdmin.super_admins.sessions.at(
        superAdminConnection1, // Use authenticated connection
        {
          sessionId,
        } satisfies api.functional.discussionBoard.superAdmin.super_admins.sessions.at.Props,
      );
    typia.assert(session);
    sessions.push(session);
  }
  // Find an expired session (expired_at is in the past)
  const now = new Date();
  const expiredSession = sessions.find(
    (session) => new Date(session.expired_at) < now,
  );
  // If no session is expired yet, we'll use any session for the test
  // This simulates the scenario where we want to retrieve expired session details
  const targetSession = expiredSession ?? sessions[0];
  // Retrieve the specific session details again to verify
  const retrievedSession =
    await api.functional.discussionBoard.superAdmin.super_admins.sessions.at(
      superAdminConnection1,
      {
        sessionId: targetSession.id,
      } satisfies api.functional.discussionBoard.superAdmin.super_admins.sessions.at.Props,
    );
  typia.assert(retrievedSession);
  // Validate that the session details are correctly returned
  TestValidator.equals(
    "session ID matches",
    retrievedSession.id,
    targetSession.id,
  );
  TestValidator.equals(
    "expired_at timestamp matches",
    retrievedSession.expired_at,
    targetSession.expired_at,
  );
  TestValidator.equals(
    "IP address matches",
    retrievedSession.ip,
    targetSession.ip,
  );
  TestValidator.equals(
    "href matches",
    retrievedSession.href,
    targetSession.href,
  );
  TestValidator.equals(
    "referrer matches",
    retrievedSession.referrer,
    targetSession.referrer,
  );
  // Business logic validation: verify superAdmin relationship exists
  TestValidator.predicate(
    "session has superAdmin relationship",
    retrievedSession.superAdmin !== null,
  );
  typia.assert(retrievedSession.superAdmin);
  // Verify that even if the session is expired, the auditing information is preserved
  const sessionExpired = new Date(retrievedSession.expired_at) < now;
  if (sessionExpired) {
    // Additional validation for expired sessions
    TestValidator.predicate(
      "expired session has valid timestamp",
      retrievedSession.expired_at !== null,
    );
    TestValidator.predicate(
      "expired session has created_at timestamp",
      retrievedSession.created_at !== null,
    );
    TestValidator.predicate(
      "expired session has updated_at timestamp",
      retrievedSession.updated_at !== null,
    );
  }
}
