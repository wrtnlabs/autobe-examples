import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVisitor";
import type { IVisitorConnectionContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IVisitorConnectionContext";
import type { IVisitorSessionContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IVisitorSessionContext";

/**
 * Test visitor registration with weak password validation.
 *
 * This test validates that the visitor registration endpoint properly enforces
 * password security requirements by rejecting passwords below the minimum
 * length of 8 characters. The system should maintain platform security
 * standards by validating that all visitor passwords meet the minimum
 * complexity requirements before account creation.
 *
 * The test verifies secure password enforcement by attempting to register a
 * visitor with a weak 4-character password and expects the system to reject
 * this registration attempt, demonstrating proper security validation.
 *
 * 1. Generate valid visitor registration data with weak password
 * 2. Attempt visitor registration with weak password
 * 3. Verify system rejects weak password appropriately
 * 4. Confirm security requirements are maintained
 */
export async function test_api_visitor_registration_weak_password(
  connection: api.IConnection,
) {
  // Generate visitor data with weak password below minimum length
  const email = typia.random<string & tags.Format<"email">>();
  const nickname = RandomGenerator.name();
  const weakPassword = "weak"; // 4 characters, below minimum of 8

  const weakVisitorData = {
    nickname,
    email,
    password: weakPassword,
    href: "https://reddit-community.com/register",
    referrer: "https://reddit-community.com/landing",
  } satisfies IRedditCommunityVisitor.ICreate;

  // Attempt registration with weak password - should fail
  await await TestValidator.error(
    "should reject password below minimum length of 8 characters",
    async () => {
      await api.functional.auth.visitor.join(connection, {
        body: weakVisitorData,
      });
    },
  );

  // Verify strong password succeeds for contrast
  const strongPassword = typia.random<string & tags.MinLength<8>>();
  const strongVisitorData = {
    nickname: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: strongPassword,
    href: "https://reddit-community.com/register",
    referrer: "https://reddit-community.com/landing",
  } satisfies IRedditCommunityVisitor.ICreate;

  const authorizedVisitor = await await api.functional.auth.visitor.join(
    connection,
    {
      body: strongVisitorData,
    },
  );

  typia.assert(authorizedVisitor);

  TestValidator.predicate(
    "should successfully register visitor with valid 8+ character password",
    authorizedVisitor.visitor.nickname === strongVisitorData.nickname &&
      authorizedVisitor.visitor.id.length > 0,
  );
}
