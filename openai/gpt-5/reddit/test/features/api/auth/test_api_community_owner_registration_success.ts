import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOwner";

/**
 * Verify successful community owner registration issues authorization tokens.
 *
 * Business context:
 *
 * - Public registration endpoint creates a community platform user intended to
 *   act as a community owner later, and immediately issues JWT tokens.
 * - The server enforces uniqueness (email, username) and requires ToS/Privacy
 *   consents at registration time.
 *
 * Steps:
 *
 * 1. Build a valid ICommunityPlatformCommunityOwner.ICreate payload with unique
 *    identifiers, strong password, and consent timestamps.
 * 2. POST /auth/communityOwner/join and receive IAuthorized response.
 * 3. Validate tokens exist and have sensible time relationships; if role is
 *    present, it equals "communityOwner".
 */
export async function test_api_community_owner_registration_success(
  connection: api.IConnection,
) {
  // 1) Prepare registration payload with compliant/randomized values
  const nowIso: string = new Date().toISOString();
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  // username: ensure pattern ^[A-Za-z0-9_]{3,20}$ and reasonable length
  const username: string = `${RandomGenerator.alphaNumeric(3)}_${RandomGenerator.alphaNumeric(5)}`;
  const password: string = RandomGenerator.alphaNumeric(12);
  const avatarUri: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const displayName: string = RandomGenerator.name(2);

  const body = {
    email,
    username,
    password,
    display_name: displayName,
    avatar_uri: avatarUri,
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: true,
    marketing_opt_in_at: nowIso,
  } satisfies ICommunityPlatformCommunityOwner.ICreate;

  // 2) Execute registration
  const output = await api.functional.auth.communityOwner.join(connection, {
    body,
  });
  typia.assert(output);

  // 3) Business validations
  TestValidator.predicate(
    "access token should be non-empty",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    output.token.refresh.length > 0,
  );

  const exp: number = Date.parse(output.token.expired_at);
  const refreshableUntil: number = Date.parse(output.token.refreshable_until);
  TestValidator.predicate(
    "access token expiration should be in the future",
    exp > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until should be on/after access token expiration",
    refreshableUntil >= exp,
  );

  if (output.role !== undefined) {
    TestValidator.equals(
      "role equals 'communityOwner' when present",
      output.role,
      "communityOwner",
    );
  }
}
