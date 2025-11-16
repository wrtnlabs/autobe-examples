import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVisitor";
import type { IVisitorConnectionContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IVisitorConnectionContext";
import type { IVisitorSessionContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IVisitorSessionContext";

/**
 * Test visitor registration with duplicate nickname to validate uniqueness
 * constraint enforcement. The system should reject attempts to create accounts
 * with existing nicknames to maintain visitor identity integrity and prevent
 * name conflicts across the platform. This test validates the collision
 * detection mechanism in the visitor account management system.
 *
 * The test demonstrates business rule enforcement where visitor accounts must
 * have unique display names regardless of email addresses. This prevents
 * identity confusion in community discussions and maintains platform security.
 *
 * Test Process:
 *
 * 1. Create initial visitor with unique nickname and email
 * 2. Attempt duplicate registration with same nickname but different email
 * 3. Verify rejection with appropriate error handling
 * 4. Confirm original visitor account remains unaffected
 */
export async function test_api_visitor_registration_duplicate_nickname(
  connection: api.IConnection,
) {
  // Create a visitor account with a unique nickname
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const commonNickname = RandomGenerator.paragraph({ sentences: 2 });

  const firstVisitor = await api.functional.auth.visitor.join(connection, {
    body: {
      nickname: commonNickname,
      email: firstEmail,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://reddit.example.com/login",
      referrer: "https://reddit.example.com",
      ip: null,
      userAgent: null,
    } satisfies IRedditCommunityVisitor.ICreate,
  });
  typia.assert(firstVisitor);

  TestValidator.equals(
    "first visitor id exists",
    typeof firstVisitor.visitor.id,
    "string",
  );
  TestValidator.equals(
    "first visitor nickname matches",
    firstVisitor.visitor.nickname,
    commonNickname,
  );

  // Attempt to register another visitor with the same nickname but different email
  const secondEmail = typia.random<string & tags.Format<"email">>();

  await TestValidator.error(
    "duplicate nickname registration should be rejected",
    async () => {
      await api.functional.auth.visitor.join(connection, {
        body: {
          nickname: commonNickname,
          email: secondEmail,
          password: RandomGenerator.alphaNumeric(12),
          href: "https://reddit.example.com/register",
          referrer: "https://reddit.example.com",
          ip: null,
          userAgent: null,
        } satisfies IRedditCommunityVisitor.ICreate,
      });
    },
  );

  // Verify that the first visitor account remains intact and unaffected
  TestValidator.predicate(
    "first visitor account still exists with correct nickname",
    firstVisitor.visitor.nickname === commonNickname,
  );
}
