import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_registration_success(
  connection: api.IConnection,
) {
  // Generate valid registration credentials with all required fields
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const password = RandomGenerator.alphabets(12); // Ensure at least 8 characters with mixed types
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = "192.168.1.100"; // Optional IP for session tracking

  // Call the registration endpoint with valid credentials
  const authorized: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        username,
        password,
        href,
        referrer,
        ip,
      } satisfies ICommunityPlatformMember.ICreate,
    });

  // Validate the response structure and all types
  typia.assert(authorized);

  // Verify that refresh token expiration is later than access token expiration
  const accessExpiration = new Date(authorized.token.expired_at).getTime();
  const refreshExpiration = new Date(
    authorized.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refresh token expiration is after access token expiration",
    refreshExpiration > accessExpiration,
  );
}
