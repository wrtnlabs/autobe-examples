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
 * Test successful member registration with complete profile information.
 *
 * This test verifies the member join endpoint with all profile fields including
 * optional biography. It validates that:
 * 1. Registration succeeds with valid email, password (min 8 chars), display name, bio, href, and referrer
 * 2. Response contains complete member profile with status='active', counts initialized to 0
 * 3. Authorization token includes access token, refresh token, and expiration timestamps
 * 4. Access token is properly formatted for Bearer authentication
 * 5. Account is immediately usable without additional verification
 */
export async function test_api_member_join_with_complete_profile(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and perform registration with complete profile
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate test data with complete profile including optional bio
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // 12 chars, exceeds min 8
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Register member with complete profile using utility function
  const authorized: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email,
        password,
        display_name: displayName,
        bio,
        href,
        referrer,
        ip,
      } satisfies IDiscussionBoardMember.IJoin,
    });
  // Validate response structure and types
  typia.assert(authorized);
  // Verify member profile business logic
  TestValidator.equals("email matches input", authorized.email, email);
  TestValidator.equals(
    "display_name matches input",
    authorized.display_name,
    displayName,
  );
  TestValidator.equals("bio matches input", authorized.bio, bio);
  TestValidator.equals("status is active", authorized.status, "active");
  TestValidator.equals(
    "articles_count initialized to 0",
    authorized.articles_count,
    0,
  );
  TestValidator.equals(
    "comments_count initialized to 0",
    authorized.comments_count,
    0,
  );
  TestValidator.predicate("deleted_at is null", authorized.deleted_at === null);
  // Verify authorization token timestamps are valid
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(authorized.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(authorized.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(authorized.token.refreshable_until) >=
      new Date(authorized.token.expired_at),
  );
  // Verify member connection has token set for subsequent authenticated operations
  TestValidator.predicate(
    "connection has authorization header",
    memberConnection.headers?.Authorization !== undefined,
  );
  // Fix: HeaderValue can be string | number | string[] | number[], need to narrow to string
  const authHeader = memberConnection.headers?.Authorization;
  TestValidator.equals(
    "authorization header uses Bearer scheme",
    typeof authHeader === "string" && authHeader.startsWith("Bearer "),
    true,
  );
}