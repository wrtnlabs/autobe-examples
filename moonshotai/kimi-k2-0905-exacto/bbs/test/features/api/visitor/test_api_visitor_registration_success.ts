import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsVisitorUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsVisitorUser";

/**
 * Test successful visitor account registration on politicsBBS discussion board.
 *
 * This test validates the complete visitor authentication flow:
 *
 * 1. Creates visitor account with valid username/password
 * 2. Verifies response contains proper visitor details
 * 3. Validates JWT token is generated for session management
 * 4. Ensures timestamps are created correctly
 * 5. Confirms proper authorization header is set
 *
 * The visitor account enables temporary guest access to political discourse
 * with limited JWT tokens for session continuity while maintaining anonymity.
 */
export async function test_api_visitor_registration_success(
  connection: api.IConnection,
) {
  // Generate test data with valid format constraints
  const visitorData = {
    username: RandomGenerator.alphaNumeric(10) satisfies string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9-]+$">,
    password: RandomGenerator.alphaNumeric(12) satisfies string &
      tags.MinLength<8> &
      tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$">,
    href: "https://politicsbbs.example.com/discussion",
    referrer: "https://news.example.com/politics",
  } satisfies IPoliticsBbsVisitorUser.IJoin;

  // Test successful visitor registration
  const visitor = await api.functional.auth.visitor.join(connection, {
    body: visitorData,
  });

  // Validate response structure matches expected authorization format
  typia.assert(visitor);

  // Verify essential visitor account fields
  TestValidator.equals("visitor id is valid UUID", visitor.id, visitor.id);
  TestValidator.equals(
    "username matches registration",
    visitor.username,
    visitorData.username,
  );
  TestValidator.equals(
    "password_hash exists",
    typeof visitor.password_hash,
    "string",
  );

  // Validate timestamps are properly formatted
  TestValidator.predicate(
    "creation timestamp is valid",
    visitor.created_at.includes("T"),
  );
  TestValidator.predicate(
    "last seen timestamp is valid",
    visitor.last_seen_at.includes("T"),
  );

  // Verify JWT token structure and validity
  TestValidator.equals(
    "access token exists",
    typeof visitor.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token exists",
    typeof visitor.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "expired_at is date-time format",
    visitor.token.expired_at.includes("T"),
  );
  TestValidator.predicate(
    "refreshable_until is date-time format",
    visitor.token.refreshable_until.includes("T"),
  );

  // Check that connection headers are updated with authorization token
  TestValidator.predicate(
    "authorization header set",
    connection.headers?.Authorization === visitor.token.access,
  );
}
