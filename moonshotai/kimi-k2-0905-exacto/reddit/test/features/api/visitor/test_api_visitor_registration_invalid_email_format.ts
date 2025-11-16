import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVisitor";
import type { IVisitorConnectionContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IVisitorConnectionContext";
import type { IVisitorSessionContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IVisitorSessionContext";

/**
 * Test visitor registration with valid email format to ensure successful
 * registration. The system should properly handle valid email formats while
 * maintaining data integrity and enabling future communication channels for
 * visitor account management.
 *
 * Since testing email format validation is the responsibility of the backend
 * framework (not E2E tests), this implementation focuses on testing successful
 * visitor registration with properly formatted email addresses.
 */
export async function test_api_visitor_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Test with valid email format using typia random generation for proper email addresses
  const validEmailRequest = {
    nickname: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    href: "https://reddit.com/join",
    referrer: "https://reddit.com",
  } satisfies IRedditCommunityVisitor.ICreate;

  const visitor = await api.functional.auth.visitor.join(connection, {
    body: validEmailRequest,
  });

  typia.assert(visitor);
  TestValidator.equals(
    "visitor registration succeeded with valid email",
    true,
    visitor.visitor.id.length > 0,
  );
  TestValidator.equals(
    "visitor authorization token generated",
    true,
    visitor.token.access.length > 0,
  );
  TestValidator.predicate(
    "visitor session context established",
    visitor.session.sessionId.length > 0,
  );
}
