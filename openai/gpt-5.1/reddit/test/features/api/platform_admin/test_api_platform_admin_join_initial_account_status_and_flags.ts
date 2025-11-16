import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate initial accountStatus and behavioral flags for a newly joined
 * platform admin.
 *
 * Business goals:
 *
 * - Ensure POST /auth/platformAdmin/join returns a fully populated
 *   ICommunityPlatformPlatformadmin.IAuthorized object.
 * - Confirm that the nested accountStatus summary is present and consistent (id,
 *   key, code, label, description, behavioral flags).
 * - Validate that behavioral flags for a brand new platform admin reflect an
 *   active/allowed state: login, posting, and voting allowed; no manual review
 *   required.
 */
export async function test_api_platform_admin_join_initial_account_status_and_flags(
  connection: api.IConnection,
) {
  // 1. Build a realistic join payload for a new platform admin
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  // 2. Call the join endpoint
  const authorizedAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });

  // 3. Structural validation of the response
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(authorizedAdmin);

  // 4. Validate accountStatus summary object
  const status: ICommunityPlatformAccountStatus.ISummary =
    authorizedAdmin.accountStatus;
  typia.assert<ICommunityPlatformAccountStatus.ISummary>(status);

  // Basic non-emptiness checks for descriptive fields
  TestValidator.predicate(
    "accountStatus.id must be a non-empty UUID string",
    status.id.length > 0,
  );
  TestValidator.predicate(
    "accountStatus.key must be a non-empty string",
    status.key.length > 0,
  );
  TestValidator.predicate(
    "accountStatus.code must be a non-empty string",
    status.code.length > 0,
  );
  TestValidator.predicate(
    "accountStatus.label must be a non-empty string",
    status.label.length > 0,
  );
  TestValidator.predicate(
    "accountStatus.description must be a non-empty string",
    status.description.length > 0,
  );

  // 5. Validate behavioral flags for a new admin
  TestValidator.equals(
    "new platform admin should be allowed to log in",
    status.isLoginAllowed,
    true,
  );
  TestValidator.equals(
    "new platform admin should be allowed to post by default",
    status.isPostingAllowed,
    true,
  );
  TestValidator.equals(
    "new platform admin should be allowed to vote by default",
    status.isVotingAllowed,
    true,
  );
  TestValidator.equals(
    "new platform admin should not require manual review",
    status.requiresManualReview,
    false,
  );

  // 6. Validate token structure for sanity (already covered by typia.assert above)
  const token: IAuthorizationToken = authorizedAdmin.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token string must be non-empty",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token string must be non-empty",
    token.refresh.length > 0,
  );
}
