import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_member_subscription_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user so that the connection
  //    carries a valid Authorization header for the memberUser actor.
  const joinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    // Optional IP: omit to let the backend infer it or treat as undefined
    href: "https://community.example.com/auth/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorized);

  // 2. Attempt to fetch a subscription by a random UUID. In a real system,
  //    this may or may not exist. We do not assert business behavior here;
  //    we only ensure that when it succeeds, the response type is correct.
  const randomSubscriptionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  try {
    const subscription: ICommunityPlatformCommunitySubscription =
      await api.functional.communityPlatform.memberUser.subscriptions.at(
        connection,
        {
          subscriptionId: randomSubscriptionId,
        },
      );
    // If the call succeeds, the DTO structure must be valid.
    typia.assert(subscription);
  } catch {
    // If an error occurs (for example, not found or forbidden), we simply
    // continue; the purpose of this test is not to distinguish the exact
    // error type here.
  }

  // 3. Explicitly validate error handling using TestValidator.error, by
  //    calling the same endpoint with another random UUID inside an async
  //    closure. We do not assert on HTTP status codes or error payloads,
  //    only that an error is thrown.
  const anotherRandomId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "member user subscription detail should error for some random id",
    async () => {
      await api.functional.communityPlatform.memberUser.subscriptions.at(
        connection,
        {
          subscriptionId: anotherRandomId,
        },
      );
    },
  );
}
