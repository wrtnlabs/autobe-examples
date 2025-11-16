import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModeratorSession";

/**
 * Test that moderator session retrieval includes all necessary security audit
 * information for administrative oversight. Validates that session details
 * contain comprehensive access tracking data including IP addresses, referrer
 * URLs, and precise timestamps required for compliance and security analysis.
 */
export async function test_api_moderator_session_security_audit(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to establish audit context
  const moderatorCreate = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    moderation_level: "senior",
    email_verified: true,
    two_factor_enabled: true,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderator);

  TestValidator.predicate(
    "moderator has proper authorization",
    moderator.token.access.length > 0,
  );
  TestValidator.equals(
    "moderator level matches",
    moderator.moderation_level,
    "senior",
  );

  // Step 2: Create moderator session with full audit trail data
  const sessionCreate = {
    ip: "192.168.1.100",
    href: "/economicDiscussion/moderator/dashboard",
    referrer: "https://admin.economicdiscussion.com/login",
  } satisfies IEconomicDiscussionModeratorSession.ICreate;

  const session: IEconomicDiscussionModeratorSession =
    await api.functional.economicDiscussion.moderator.moderators.sessions.create(
      connection,
      {
        moderatorId: moderator.id,
        body: sessionCreate,
      },
    );
  typia.assert(session);

  // Step 3: Retrieve session details to validate security audit information
  const retrievedSession: IEconomicDiscussionModeratorSession =
    await api.functional.economicDiscussion.moderator.moderators.sessions.at(
      connection,
      {
        moderatorId: moderator.id,
        sessionId: session.id,
      },
    );
  typia.assert(retrievedSession);

  // Validate comprehensive security audit data
  TestValidator.equals("session ID matches", retrievedSession.id, session.id);
  TestValidator.equals(
    "moderator ID matches",
    retrievedSession.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "username matches",
    retrievedSession.moderator.username,
    moderator.username,
  );

  // Validate IP address tracking for security audit
  TestValidator.equals(
    "IP address tracked",
    retrievedSession.ip,
    "192.168.1.100",
  );
  TestValidator.predicate(
    "IP format is valid IPv4",
    /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(retrievedSession.ip),
  );

  // Validate referrer information for access tracking
  TestValidator.equals(
    "referrer tracked",
    retrievedSession.referrer,
    "https://admin.economicdiscussion.com/login",
  );
  TestValidator.predicate(
    "referrer is valid URL",
    retrievedSession.referrer?.startsWith("https://") || false,
  );

  // Validate administrative panel access URL
  TestValidator.equals(
    "admin panel access tracked",
    retrievedSession.href,
    "/economicDiscussion/moderator/dashboard",
  );
  TestValidator.predicate(
    "href contains moderator path",
    retrievedSession.href.includes("moderator"),
  );

  // Validate timestamp information for audit trail
  TestValidator.predicate(
    "creation timestamp exists",
    retrievedSession.created_at.length > 0,
  );
  TestValidator.predicate(
    "creation timestamp is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedSession.created_at),
  );

  // Validate moderator summary information for audit context
  TestValidator.predicate(
    "moderator summary includes ID",
    retrievedSession.moderator.id.length > 0,
  );
  TestValidator.predicate(
    "moderator summary includes username",
    retrievedSession.moderator.username.length > 0,
  );
  TestValidator.equals(
    "email verification status tracked",
    retrievedSession.moderator.email_verified,
    true,
  );
  TestValidator.equals(
    "two-factor status tracked",
    retrievedSession.moderator.two_factor_enabled,
    true,
  );
  TestValidator.equals(
    "moderation level tracked",
    retrievedSession.moderator.moderation_level,
    "senior",
  );
  TestValidator.predicate(
    "appointment timestamp exists",
    retrievedSession.moderator.created_at.length > 0,
  );

  // Validate session security metadata
  TestValidator.predicate(
    "session has expiration tracking",
    retrievedSession.expired_at !== undefined,
  );
}
