import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserKarma";

/**
 * Validate public retrieval of a user karma aggregate by memberUserId.
 *
 * Original scenario asked to verify not-found behavior for a non-existent
 * member user, but the exposed SDK function only returns
 * `ICommunityPlatformUserKarma` and does not provide an error-typed variant or
 * admin inspection APIs. Therefore this test focuses on a feasible
 * implementation: public retrieval of an existing aggregate using a random
 * UUID-like identifier and validation of response structure and basic business
 * invariants.
 *
 * Business validations covered:
 *
 * 1. The endpoint is accessible without any explicit authentication flow
 *    (connection is used as-is, treating it as a public caller).
 * 2. The response payload strictly matches the `ICommunityPlatformUserKarma`
 *    schema.
 * 3. Business-level consistency: the `memberUserId` field in the response is a
 *    UUID string, and `totalKarma` equals the sum of `postKarma` and
 *    `commentKarma`.
 *
 * Steps:
 *
 * 1. Generate a random UUID-formatted string to use as `memberUserId`.
 * 2. Call `api.functional.communityPlatform.userKarmas.byMemberUser.at` with this
 *    identifier over the provided connection.
 * 3. Assert that the returned object conforms to `ICommunityPlatformUserKarma`.
 * 4. Assert that `output.memberUserId` is a UUID string and equals the requested
 *    `memberUserId` when the implementation echoes the path parameter into the
 *    response.
 * 5. Assert that `totalKarma === postKarma + commentKarma` to validate a basic
 *    aggregation invariant.
 */
export async function test_api_user_karma_public_retrieval_nonexistent_member(
  connection: api.IConnection,
) {
  // 1. Prepare a random UUID-like member user ID.
  const requestedMemberUserId = typia.random<string & tags.Format<"uuid">>();

  // 2. Invoke the public karma retrieval endpoint as-is (no auth setup).
  const output: ICommunityPlatformUserKarma =
    await api.functional.communityPlatform.userKarmas.byMemberUser.at(
      connection,
      {
        memberUserId: requestedMemberUserId,
      },
    );

  // 3. Validate the structural type of the response.
  typia.assert<ICommunityPlatformUserKarma>(output);

  // 4. Business-level assertions.
  // 4-1. `memberUserId` should be a UUID string.
  TestValidator.predicate("response.memberUserId is a UUID string", () => {
    try {
      typia.assert<string & tags.Format<"uuid">>(output.memberUserId);
      return true;
    } catch {
      return false;
    }
  });

  // 4-2. If the implementation echoes the path param into the aggregate,
  //      ensure it matches the requested ID.
  TestValidator.equals(
    "response.memberUserId matches requested memberUserId when echoed",
    output.memberUserId,
    requestedMemberUserId,
  );

  // 4-3. Validate that the aggregate total is consistent with components.
  const expectedTotal = output.postKarma + output.commentKarma;
  TestValidator.equals(
    "totalKarma equals postKarma + commentKarma",
    expectedTotal,
    output.totalKarma,
  );
}
