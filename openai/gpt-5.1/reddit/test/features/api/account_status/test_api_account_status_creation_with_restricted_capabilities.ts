import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate creation of a restrictive account status by a platform
 * administrator.
 *
 * Business goal
 *
 * - Ensure that a platform admin can define an account status where all
 *   capabilities (login, posting, voting) are disabled and manual review is
 *   required, matching safety policy expectations.
 * - Confirm that the configuration flags and descriptive fields are stored and
 *   returned exactly as requested.
 *
 * Test steps
 *
 * 1. Register a new platform administrator via auth.platformAdmin.join using a
 *    realistic ICommunityPlatformPlatformadmin.IJoin payload. The SDK will
 *    automatically attach the returned access token to the connection, so
 *    subsequent calls run under this admin context.
 * 2. Call communityPlatform.platformAdmin.accountStatuses.create with an
 *    ICommunityPlatformAccountStatus.ICreate body that represents a strict
 *    "read‑only" style status:
 *
 *    - Key: "SUSPENDED_CONTENT_ONLY"
 *    - Label: "Suspended  Read Only" (or similar)
 *    - Description: explanatory text about disabled capabilities and required manual
 *         review
 *    - IsLoginAllowed: false
 *    - IsPostingAllowed: false
 *    - IsVotingAllowed: false
 *    - RequiresManualReview: true
 * 3. Use typia.assert to validate that the response conforms to
 *    ICommunityPlatformAccountStatus.
 * 4. Use TestValidator.equals / predicate to confirm that:
 *
 *    - Key, label, description in the response equal the input values
 *    - IsLoginAllowed, isPostingAllowed, isVotingAllowed, requiresManualReview flags
 *         in the response equal the input flags.
 *
 * Notes
 *
 * - We do not test error paths or type validation here; only the successful admin
 *   flow and correct flag persistence are covered.
 */
export async function test_api_account_status_creation_with_restricted_capabilities(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator so that subsequent calls run
  //    under platformAdmin authorization.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin-console.example.com/register", // valid URI string
    referrer: "https://example.com/landing", // valid URI string
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a restrictive account status with all capabilities disabled and
  //    manual review required.
  const statusCreateBody = {
    key: "SUSPENDED_CONTENT_ONLY",
    label: "Suspended  Read Only",
    description:
      "Account is suspended and limited to read-only access. Login, posting, and voting are disabled until a manual review is completed by platform staff.",
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusCreateBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // 3. Business-level validations: ensure the returned values match the
  //    requested configuration exactly.
  TestValidator.equals(
    "account status key should match input",
    createdStatus.key,
    statusCreateBody.key,
  );
  TestValidator.equals(
    "account status label should match input",
    createdStatus.label,
    statusCreateBody.label,
  );
  TestValidator.equals(
    "account status description should match input",
    createdStatus.description ?? null,
    statusCreateBody.description ?? null,
  );

  TestValidator.equals(
    "isLoginAllowed flag should be false for suspended read-only status",
    createdStatus.isLoginAllowed,
    statusCreateBody.isLoginAllowed,
  );
  TestValidator.equals(
    "isPostingAllowed flag should be false for suspended read-only status",
    createdStatus.isPostingAllowed,
    statusCreateBody.isPostingAllowed,
  );
  TestValidator.equals(
    "isVotingAllowed flag should be false for suspended read-only status",
    createdStatus.isVotingAllowed,
    statusCreateBody.isVotingAllowed,
  );
  TestValidator.equals(
    "requiresManualReview flag should be true for suspended read-only status",
    createdStatus.requiresManualReview,
    statusCreateBody.requiresManualReview,
  );
}
