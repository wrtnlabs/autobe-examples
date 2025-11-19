import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Validates email format constraints during contributor registration.
 *
 * Tests that the contributor registration endpoint properly accepts valid email
 * formats according to RFC 5322 standards. The test verifies successful account
 * creation with various valid email formats including standard format,
 * subdomain format, and domains with numeric characters.
 *
 * The test covers:
 *
 * 1. Standard email format registration success (user@domain.com)
 * 2. Subdomain email format registration success (user@mail.domain.com)
 * 3. Numeric domain email format registration success (user@123domain.com)
 * 4. Email with special characters in local part (user.name+tag@domain.com)
 * 5. Proper JWT token generation and account state validation
 */
export async function test_api_contributor_registration_email_format(
  connection: api.IConnection,
) {
  // Test Case 1: Valid email format - standard format (user@domain.com)
  const standardEmailUser: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: "contributor@example.com",
        username: "standard_email_user",
        password: "SecurePass123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(standardEmailUser);
  TestValidator.equals(
    "standard email format should be registered successfully",
    standardEmailUser.email,
    "contributor@example.com",
  );
  TestValidator.predicate(
    "new contributor should have active account status",
    standardEmailUser.account_status === "active",
  );
  TestValidator.predicate(
    "JWT access token should be provided",
    standardEmailUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "email verification should initially be false",
    standardEmailUser.email_verified === false,
  );

  // Test Case 2: Valid email format - subdomain format (user@mail.domain.com)
  const subdomainEmailUser: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: "user@mail.example.com",
        username: "subdomain_email_user",
        password: "SecurePass456!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(subdomainEmailUser);
  TestValidator.equals(
    "subdomain email format should be registered successfully",
    subdomainEmailUser.email,
    "user@mail.example.com",
  );
  TestValidator.predicate(
    "contributor with subdomain email should have active status",
    subdomainEmailUser.account_status === "active",
  );

  // Test Case 3: Valid email format - numeric domain (user@123domain.com)
  const numericDomainUser: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: "user@123example.com",
        username: "numeric_domain_user",
        password: "SecurePass789!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(numericDomainUser);
  TestValidator.equals(
    "numeric domain email format should be registered successfully",
    numericDomainUser.email,
    "user@123example.com",
  );

  // Test Case 4: Valid email format - with special characters in local part
  const specialCharEmailUser: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: "user.name+tag@example.com",
        username: "special_char_email_user",
        password: "SecurePass012!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(specialCharEmailUser);
  TestValidator.equals(
    "email with special characters in local part should succeed",
    specialCharEmailUser.email,
    "user.name+tag@example.com",
  );
  TestValidator.predicate(
    "account with special character email should be active",
    specialCharEmailUser.account_status === "active",
  );

  // Test Case 5: Verify token structure for all registered contributors
  TestValidator.predicate(
    "refresh token should be provided for session management",
    standardEmailUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should be set",
    standardEmailUser.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token expiration should be set",
    standardEmailUser.token.refreshable_until.length > 0,
  );
}
