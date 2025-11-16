import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVisitor";
import type { IVisitorConnectionContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IVisitorConnectionContext";
import type { IVisitorSessionContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IVisitorSessionContext";

/**
 * Test successful visitor registration with valid data.
 *
 * Validates that guests can create temporary accounts with email and nickname,
 * receiving proper authentication tokens and session context. This workflow
 * tests the guest-to-member conversion funnel foundation by ensuring visitors
 * can seamlessly begin exploring communities with proper security measures.
 *
 * Test steps:
 *
 * 1. Generate valid visitor registration data with proper email format
 * 2. Call visitor registration API with complete connection context
 * 3. Verify the response contains visitor account summary
 * 4. Validate authentication tokens are properly generated
 * 5. Confirm session context is established with session ID and timestamps
 * 6. Verify token is automatically set in connection headers
 */
export async function test_api_visitor_registration_success(
  connection: api.IConnection,
) {
  // Generate visitor registration data with valid format constraints
  const nickname = RandomGenerator.name(2); // Short readable name for visitor
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();

  // Create visitor connection context with session tracking
  const connectionContext: IVisitorConnectionContext = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<(string & tags.Format<"ipv4">) | null | undefined>(),
    userAgent: RandomGenerator.name(3), // Browser user agent string
  } satisfies IVisitorConnectionContext;

  // Complete visitor registration request
  const registrationData = {
    nickname,
    email,
    password,
    href: connectionContext.href,
    referrer: connectionContext.referrer,
    ip: connectionContext.ip,
    userAgent: connectionContext.userAgent,
  } satisfies IRedditCommunityVisitor.ICreate;

  // Execute visitor registration
  const visitorAuth: IRedditCommunityVisitor.IAuthorized =
    await api.functional.auth.visitor.join(connection, {
      body: registrationData,
    });

  // Validate complete response structure
  typia.assert(visitorAuth);

  // Verify visitor summary information
  TestValidator.equals(
    "visitor nickname matches registration",
    visitorAuth.visitor.nickname,
    nickname,
  );
  TestValidator.predicate("visitor has valid ID", () =>
    typia.is<string & tags.Format<"uuid">>(visitorAuth.visitor.id),
  );
  TestValidator.predicate("visitor joined at timestamp exists", () =>
    typia.is<string & tags.Format<"date-time">>(visitorAuth.visitor.joinedAt),
  );

  // Validate authentication token presence
  TestValidator.predicate(
    "access token provided",
    () => visitorAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token provided",
    () => visitorAuth.token.refresh.length > 0,
  );
  TestValidator.predicate("token has expiration", () =>
    typia.is<string & tags.Format<"date-time">>(visitorAuth.token.expired_at),
  );
  TestValidator.predicate("token has refresh period", () =>
    typia.is<string & tags.Format<"date-time">>(
      visitorAuth.token.refreshable_until,
    ),
  );

  // Verify session context establishment
  TestValidator.predicate(
    "session context exists",
    () => visitorAuth.session.sessionId.length > 0,
  );
  TestValidator.predicate("session has creation timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(visitorAuth.session.createdAt),
  );
  TestValidator.predicate("session has expiration timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(visitorAuth.session.expiresAt),
  );

  // Validate connection context is preserved
  TestValidator.equals(
    "session connection href matches",
    visitorAuth.session.connection.href,
    connectionContext.href,
  );
  TestValidator.equals(
    "session connection referrer matches",
    visitorAuth.session.connection.referrer,
    connectionContext.referrer,
  );
  TestValidator.equals(
    "session connection IP matches",
    visitorAuth.session.connection.ip,
    connectionContext.ip,
  );
  TestValidator.equals(
    "session connection userAgent matches",
    visitorAuth.session.connection.userAgent,
    connectionContext.userAgent,
  );

  // Verify token is automatically set in connection
  TestValidator.predicate(
    "connection has Authorization header",
    () => connection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "Authorization header matches visitor access token",
    connection.headers?.Authorization,
    visitorAuth.token.access,
  );
}
