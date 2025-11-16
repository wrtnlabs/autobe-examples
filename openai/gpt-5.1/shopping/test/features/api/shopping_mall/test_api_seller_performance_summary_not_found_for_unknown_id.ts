import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPerformanceSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceSummary";

/**
 * Verify that asking for a seller performance summary with an unknown ID as a
 * platform admin results in an error instead of a summary record.
 *
 * Business context:
 *
 * - Only platform admins can access seller performance summaries.
 * - When a summary does not exist for a given ID, the backend must treat it as a
 *   not-found situation and must not leak any other seller summary data.
 *
 * Steps:
 *
 * 1. Join as a platform admin using POST /auth/platformAdmin/join. This returns
 *    IShoppingMallPlatformAdmin.IAuthorized and the SDK automatically attaches
 *    the access token into the connection headers for subsequent calls.
 * 2. Generate a random UUID value for sellerPerformanceSummaryId. The test does
 *    not create any seller performance summary records, so this ID is expected
 *    not to exist in shopping_mall_seller_performance_summaries for this
 *    isolated test.
 * 3. Call GET
 *    /shoppingMall/platformAdmin/sellerPerformanceSummaries/{sellerPerformanceSummaryId}
 *    via
 *    api.functional.shoppingMall.platformAdmin.sellerPerformanceSummaries.at
 *    using the random UUID.
 * 4. Assert via TestValidator.error that the call fails (throws) and therefore
 *    does not return an IShoppingMallSellerPerformanceSummary. In accordance
 *    with global test rules, do not assert specific HTTP status codes or
 *    inspect the error body.
 */
export async function test_api_seller_performance_summary_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin so that we can legally call the
  //    sellerPerformanceSummaries detail endpoint.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Generate a random UUID that will be used as an unknown
  //    seller performance summary ID.
  const unknownSummaryId = typia.random<string & tags.Format<"uuid">>();

  // 3 & 4. Call the detail endpoint with the unknown ID and assert that
  //        it fails, meaning no IShoppingMallSellerPerformanceSummary is
  //        returned. We only validate that an error occurs, not its
  //        HTTP status code or payload.
  await TestValidator.error(
    "unknown seller performance summary id should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.sellerPerformanceSummaries.at(
        connection,
        {
          sellerPerformanceSummaryId: unknownSummaryId,
        },
      );
    },
  );
}
