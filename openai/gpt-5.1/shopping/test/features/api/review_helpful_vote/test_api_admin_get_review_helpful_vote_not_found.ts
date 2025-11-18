import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallReviewHelpfulVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewHelpfulVote";

/**
 * Verify that the admin helpful vote detail API fails when the target helpful
 * vote does not exist.
 *
 * Business context
 *
 * - The admin-only endpoint GET
 *   /shoppingMall/admin/reviewHelpfulVotes/{helpfulVoteId} is used by
 *   moderators and support agents to inspect a specific helpful vote record
 *   created by a customer on a product review.
 * - When an administrator queries a helpfulVoteId that does not exist in
 *   shopping_mall_review_helpful_votes, the backend must not return a normal
 *   IShoppingMallReviewHelpfulVote record. Instead, it must fail with an error
 *   corresponding to a 404 Not Found at the HTTP level, without exposing
 *   internal persistence details.
 *
 * What this test validates (within framework constraints)
 *
 * 1. An administrator can be registered via POST /auth/admin/join and the returned
 *    IShoppingMallAdmin.IAuthorized payload is structurally valid.
 * 2. After admin registration, an authenticated admin connection attempts to
 *    retrieve a helpful vote using a random UUID that is extremely unlikely to
 *    match any existing row.
 * 3. The detail endpoint call fails (throws) when the helpfulVoteId does not
 *    correspond to an existing record.
 *
 * Notes on constraints
 *
 * - Test rules forbid direct HTTP status code assertions and detailed inspection
 *   of error payloads, so this test only validates that the operation results
 *   in an error, not that the status code is exactly 404 or that the error body
 *   follows a particular schema.
 * - The scenario draft also mentioned comparing behavior when unrelated helpful
 *   votes exist, but we do not have any create-vote endpoint in the provided
 *   SDK, so that part is intentionally omitted.
 */
export async function test_api_admin_get_review_helpful_vote_not_found(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain an authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Generate a random UUID that is unlikely to exist as a helpful vote ID
  const fakeHelpfulVoteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  typia.assert<string & tags.Format<"uuid">>(fakeHelpfulVoteId);

  // 3. Calling the detail endpoint with the non-existent ID must fail.
  //    We do not assert on HTTP status or error body, only that an error
  //    occurs for this invalid resource lookup.
  await TestValidator.error(
    "non-existent helpful vote should cause error",
    async () => {
      // Intentionally not capturing the response, as we expect this to throw.
      await api.functional.shoppingMall.admin.reviewHelpfulVotes.at(
        connection,
        { helpfulVoteId: fakeHelpfulVoteId },
      );
    },
  );
}
