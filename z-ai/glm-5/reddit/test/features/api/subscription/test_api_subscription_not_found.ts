import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
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
 * Test retrieval of a non-existent subscription.
 *
 * Scenario: An authenticated member attempts to retrieve a subscription using
 * a valid UUID format that does not exist in the database.
 *
 * Steps:
 * 1. Authenticate as a member via join endpoint
 * 2. Generate a random UUID for a subscription that doesn't exist
 * 3. Call GET /member/subscriptions/{subscriptionId} with the non-existent ID
 * 4. Verify that the API returns 404 Not Found
 *
 * Validation points:
 * - Response returns 404 Not Found status
 * - Authentication passes but the requested resource is not found
 * - The system correctly distinguishes between authorization failures and resource not found
 */
export async function test_api_subscription_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Generate a non-existent subscription ID (valid UUID format)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the API with non-existent subscription ID
  // 4. Verify 404 Not Found error
  await TestValidator.httpError(
    "should return 404 for non-existent subscription",
    404,
    async () => {
      await api.functional.communityPlatform.member.subscriptions.at(
        memberConnection,
        { subscriptionId: nonExistentId },
      );
    },
  );
}
