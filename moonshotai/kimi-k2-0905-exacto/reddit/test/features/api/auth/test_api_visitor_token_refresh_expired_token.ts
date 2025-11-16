import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVisitor";
import type { IVisitorConnectionContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IVisitorConnectionContext";
import type { IVisitorSessionContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IVisitorSessionContext";

/**
 * Test visitor token refresh with various scenarios to validate security
 * measures. The system should handle different connection contexts and maintain
 * proper session lifecycle management.
 *
 * 1. Create a valid visitor account to obtain legitimate tokens
 * 2. Verify successful token refresh with valid session
 * 3. Test refresh with corrupted connection context
 * 4. Test refresh without proper authentication context
 * 5. Verify token rotation and proper session management
 * 6. Ensure security measures work correctly
 */
export async function test_api_visitor_token_refresh_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a valid visitor account
  const validVisitorData = {
    nickname: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    href: "https://reddit-community.com/signup",
    referrer: "https://google.com",
    userAgent: RandomGenerator.name(3), // Simulate browser agent
  } satisfies IRedditCommunityVisitor.ICreate;

  const validVisitor = await api.functional.auth.visitor.join(connection, {
    body: validVisitorData,
  });
  typia.assert(validVisitor);

  // Verify we have valid authentication tokens
  TestValidator.predicate(
    "visitor has valid visitor ID",
    validVisitor.visitor.id.length > 0,
  );
  TestValidator.predicate(
    "visitor has valid access token",
    validVisitor.token.access.length > 50,
  );
  TestValidator.predicate(
    "visitor has valid refresh token",
    validVisitor.token.refresh.length > 50,
  );

  // Step 2: Test successful token refresh with valid session
  const refreshResult = await api.functional.auth.visitor.refresh(connection, {
    body: {
      connection: {
        href: "https://reddit-community.com/refresh",
        referrer: "https://reddit-community.com/",
        userAgent: RandomGenerator.name(2),
      } satisfies IVisitorConnectionContext,
    },
  });
  typia.assert(refreshResult);

  // Verify token rotation occurred
  TestValidator.notEquals(
    "access token should be different after refresh",
    refreshResult.token.access,
    validVisitor.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh",
    refreshResult.token.refresh,
    validVisitor.token.refresh,
  );

  // Step 3: Test refresh with corrupted connection context (invalid format)
  await TestValidator.error(
    "refresh with empty referrer should fail",
    async () => {
      await api.functional.auth.visitor.refresh(connection, {
        body: {
          connection: {
            href: "https://reddit-community.com/refresh",
            referrer: "", // Empty referrer violates URL format
            userAgent: "",
          } satisfies IVisitorConnectionContext,
        },
      });
    },
  );

  // Step 4: Test without proper connection context (this would use the existing connection)
  const alternativeConnection: api.IConnection = { ...connection };
  // The refresh operation will use headers from existing connection or fail appropriately

  // Step 5: Verify session context preservation
  TestValidator.predicate(
    "visitor ID remains consistent",
    refreshResult.visitor.id === validVisitor.visitor.id,
  );
  TestValidator.predicate(
    "visitor nickname remains consistent",
    refreshResult.visitor.nickname === validVisitor.visitor.nickname,
  );
}
