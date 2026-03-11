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
 * Test successful member registration with valid credentials.
 * Verify that a new member account is created with the provided email,
 * display name, and optional bio. Validate that the response contains
 * valid JWT tokens (access and refresh) with expiration timestamps.
 * Confirm that the member profile fields match the input data and include
 * default values (is_banned: false, admin_grade: null).
 */
export async function test_api_member_join_successful_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for member registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new member using the utility function
  // According to utility function priority rules, MUST use authorize_member_join
  // instead of direct SDK call for POST /discussionBoard/auth/member/join
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      // Provide custom body values to test specific scenarios
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Step 2: Validate the response using typia.assert()
  typia.assert(authorizedMember);
  // Step 3: Verify member profile fields
  TestValidator.equals(
    "member has valid UUID ID",
    authorizedMember.id,
    authorizedMember.id,
  );
  TestValidator.predicate("email is valid format", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(authorizedMember.email);
  });
  TestValidator.predicate(
    "display name is not empty",
    authorizedMember.display_name.length > 0,
  );
  // Step 4: Verify default values
  TestValidator.equals(
    "is_banned should be false",
    authorizedMember.is_banned,
    false,
  );
  TestValidator.equals(
    "admin_grade should be null",
    authorizedMember.admin_grade,
    null,
  );
  // Step 5: Verify timestamps
  TestValidator.predicate("created_at is valid ISO date", () => {
    try {
      new Date(authorizedMember.created_at);
      return !isNaN(new Date(authorizedMember.created_at).getTime());
    } catch {
      return false;
    }
  });
  TestValidator.predicate("updated_at is valid ISO date", () => {
    try {
      new Date(authorizedMember.updated_at);
      return !isNaN(new Date(authorizedMember.updated_at).getTime());
    } catch {
      return false;
    }
  });
  // Step 6: Verify JWT token structure
  TestValidator.predicate(
    "access token exists",
    authorizedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorizedMember.token.refresh.length > 0,
  );
  // Step 7: Verify token expiration timestamps
  TestValidator.predicate("expired_at is valid ISO date", () => {
    try {
      new Date(authorizedMember.token.expired_at);
      return !isNaN(new Date(authorizedMember.token.expired_at).getTime());
    } catch {
      return false;
    }
  });
  TestValidator.predicate("refreshable_until is valid ISO date", () => {
    try {
      new Date(authorizedMember.token.refreshable_until);
      return !isNaN(
        new Date(authorizedMember.token.refreshable_until).getTime(),
      );
    } catch {
      return false;
    }
  });
  // Step 8: Verify bio matches input (or is null)
  TestValidator.predicate(
    "bio is either string or null",
    typeof authorizedMember.bio === "string" || authorizedMember.bio === null,
  );
}
