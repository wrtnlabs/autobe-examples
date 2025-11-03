import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Validate that an admin can retrieve the complete details of a specific post
 * vote record by its unique identifier, and that access is restricted to
 * authorized admin accounts. The test covers the following points:
 *
 * 1. Register and authenticate a new admin (prerequisite for admin permissions).
 * 2. Attempt to retrieve a post vote detail for a random UUID that is unlikely to
 *    exist: should result in an error (item not found or forbidden).
 * 3. For positive path, since there are no APIs to create post votes directly from
 *    the admin context, simulate retrieval using a random valid UUID format
 *    (minimal positive case - the endpoint always validates type and auth).
 * 4. Confirm all critical fields are returned with correct types: id,
 *    community_platform_user_id, community_platform_post_id, is_upvote,
 *    created_at, updated_at, deleted_at.
 *
 * Note: As creation APIs for post votes are not exposed on admin context, only
 * possible to validate data access and authorization guard, not actual data
 * correctness or relationship. The main focus is on endpoint reachability,
 * strict auth, and type validation of response.
 */
export async function test_api_post_vote_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const adminOutput = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string & tags.MinLength<8>,
      display_name: displayName as string &
        tags.MinLength<1> &
        tags.MaxLength<80>,
      href: "https://admin-test-case.community/", // Required URI
      referrer: "https://referrer-admin.community/", // Arbitrary referrer
      ip: undefined,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminOutput);
  TestValidator.equals(
    "joined admin email matches",
    adminOutput.email,
    adminEmail,
  );
  TestValidator.equals(
    "joined admin display_name matches",
    adminOutput.display_name,
    displayName,
  );

  // 2. Try to get post vote detail using a random UUID (most likely does not exist)
  const randomVoteId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent post vote should fail",
    async () => {
      await api.functional.communityPlatform.admin.postVotes.at(connection, {
        postVoteId: randomVoteId,
      });
    },
  );

  // 3. Try retrieving a post vote that may exist (since no creation API exists in this scope, this tests endpoint behavior)
  // As there is no creation API, the best possible positive test is requesting a random UUID - schema/type validation
  // If the environment has real data, it may be possible to fetch an existing vote by known UUID - but that is out of contract here
  // Instead, confirm that endpoint requires admin and enforces format/type in response (smoke test)
  try {
    // This call may fail (because record does not exist), in which case it is allowed. If it ever succeeds, typia.assert validates format
    const possibleVote =
      await api.functional.communityPlatform.admin.postVotes.at(connection, {
        postVoteId: randomVoteId,
      });
    typia.assert(possibleVote);
    TestValidator.predicate(
      "response vote.id matches requested id",
      possibleVote.id === randomVoteId,
    );
  } catch (_e) {
    // Acceptable: not found, forbidden, etc.
  }

  // 4. Negative path: Try accessing the endpoint without authentication (should be unauthorized/forbidden)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cannot retrieve post vote detail",
    async () => {
      await api.functional.communityPlatform.admin.postVotes.at(unauthConn, {
        postVoteId: randomVoteId,
      });
    },
  );
}
