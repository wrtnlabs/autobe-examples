import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member registration with email verification workflow initiation.
 *
 * This test validates that member registration properly returns authentication
 * tokens and member profile information, indicating the email verification
 * workflow has been initiated. The test verifies:
 *
 * 1. Registration succeeds with valid credentials
 * 2. Response contains active status indicating account is ready
 * 3. Authentication tokens (access and refresh) are properly issued
 * 4. Token expiration timestamps are set correctly
 * 5. Member profile includes all required fields
 *
 * @param connection Base connection for the test
 */
export async function test_api_member_join_email_verification_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Register new member - this initiates email verification workflow
  const member: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  // Validate complete response structure - this performs full type validation
  typia.assert(member);
  // Verify business logic: account status and profile data
  TestValidator.equals("status is active", member.status, "active");
  TestValidator.predicate(
    "articles count is non-negative",
    member.articles_count >= 0,
  );
  TestValidator.predicate(
    "comments count is non-negative",
    member.comments_count >= 0,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    member.deleted_at,
    null,
  );
  // Verify token expiration business logic
  const now = new Date();
  const expiredAt = new Date(member.token.expired_at);
  const refreshableUntil = new Date(member.token.refreshable_until);
  TestValidator.predicate("access token expires in future", expiredAt > now);
  TestValidator.predicate(
    "refresh token valid in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil >= expiredAt,
  );
}
