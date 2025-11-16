import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test unauthorized access to karma score endpoint.
 *
 * This test validates that the karma score retrieval endpoint properly rejects
 * unauthenticated requests with an HTTP 401 Unauthorized response. The security
 * control ensures that karma score data is only accessible to authenticated
 * members, preventing anonymous users from viewing member reputation
 * information.
 *
 * Test workflow:
 *
 * 1. Create an authenticated member account to establish valid karma data
 * 2. Create an unauthenticated connection (without authorization headers)
 * 3. Attempt to retrieve karma score using the unauthenticated connection
 * 4. Verify that the request fails with HTTP 401 Unauthorized error
 */
export async function test_api_karma_score_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member with a working connection
  const authenticatedConnection: api.IConnection = { ...connection };

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(authenticatedConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        password: "SecurePassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create unauthenticated connection without authorization headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3 & 4: Attempt to retrieve karma score without authentication
  // Verify request fails with HTTP 401 Unauthorized
  await TestValidator.httpError(
    "should reject unauthorized karma score access with 401",
    401,
    async () => {
      return await api.functional.communityPlatform.member.members.karmaScores.at(
        unauthenticatedConnection,
        {
          memberId: member.id,
        },
      );
    },
  );
}
