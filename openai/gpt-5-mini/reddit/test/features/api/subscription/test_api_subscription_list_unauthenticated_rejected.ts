import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsUserSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsUserSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsUserSubscription";

export async function test_api_subscription_list_unauthenticated_rejected(
  connection: api.IConnection,
) {
  /**
   * Purpose: Attempt to list a member's subscriptions without authentication
   * and ensure the request is rejected (authentication required).
   *
   * Strategy:
   *
   * - Use a randomized username to avoid relying on existing fixtures.
   * - Provide a minimal, valid request body that satisfies
   *   ICommunityBbsUserSubscription.IRequest.
   * - Expect the call to throw an HTTP error for missing credentials. Assert
   *   using TestValidator.httpError with expected status 401.
   */

  // 1) Prepare inputs
  const username: string = typia.random<string>();
  const requestBody = {} satisfies ICommunityBbsUserSubscription.IRequest;

  // 2) Execute the request without performing any authentication.
  //    The SDK/connection is used as-is, we DO NOT touch connection.headers.
  await TestValidator.httpError(
    "unauthenticated client should be rejected when listing subscriptions",
    401,
    async () => {
      await api.functional.communityBbs.communityMember.communityMembers.subscriptions.index(
        connection,
        {
          username,
          body: requestBody,
        },
      );
    },
  );
}
