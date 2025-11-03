import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsUserSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserSubscription";

/**
 * Ensure unauthenticated subscription creation is rejected.
 *
 * Business context:
 *
 * - Subscriptions are a per-member resource and require authentication.
 * - An unauthenticated client must not be able to create a subscription on behalf
 *   of any user. This test verifies the API enforces authentication.
 *
 * Steps:
 *
 * 1. Build an unauthenticated connection by cloning the provided connection and
 *    replacing headers with an empty object (do not mutate connection.headers
 *    beyond creation).
 * 2. Compose a valid ICommunityBbsUserSubscription.ICreate request body using
 *    typia.random for UUID and exact enum values for delivery settings.
 * 3. Call the subscription create SDK function and assert that it fails with 401
 *    Unauthorized using TestValidator.httpError. The callback is async and
 *    awaits the SDK call.
 * 4. Repeat the unauthenticated call to assert consistent rejection behavior.
 */
export async function test_api_subscription_create_unauthenticated_rejected(
  connection: api.IConnection,
) {
  // 1) Create an unauthenticated connection clone (approved pattern)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Prepare a valid request body that satisfies the DTO
  const requestBody = {
    community_id: typia.random<string & tags.Format<"uuid">>(),
    delivery_channel: "in_app",
    delivery_frequency: "immediate",
  } satisfies ICommunityBbsUserSubscription.ICreate;

  // 3) Attempt the unauthenticated request and expect 401 Unauthorized
  await TestValidator.httpError(
    "unauthenticated subscription creation should be rejected with 401",
    401,
    async () => {
      await api.functional.communityBbs.communityMember.communityMembers.subscriptions.create(
        unauthConn,
        {
          username: RandomGenerator.name(1),
          body: requestBody,
        },
      );
    },
  );

  // 4) Repeat to ensure consistent behavior (still rejected)
  await TestValidator.httpError(
    "second unauthenticated attempt should also be rejected with 401",
    401,
    async () => {
      await api.functional.communityBbs.communityMember.communityMembers.subscriptions.create(
        unauthConn,
        {
          username: RandomGenerator.name(1),
          body: requestBody,
        },
      );
    },
  );
}
