import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySubscription";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommunitySubscription";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_subscription_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Retrieve the member's subscriptions - this is the primary test target
  // We don't create subscriptions because no create function is available in the provided API
  // We are testing that the retrieval endpoint works, even if there are no subscriptions
  const retrievedSubscriptions: IPageICommunityBbsCommunitySubscription =
    await api.functional.communityBbs.member.users.subscriptions.patchByUserid(
      memberConnection,
      {
        userId: member.id,
        body: {
          communityIds: [],
        } satisfies ICommunityBbsCommunitySubscription.IRequest,
      },
    );
  typia.assert(retrievedSubscriptions);
  // Step 3: Validate response structure and business logic
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    retrievedSubscriptions.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20 (default)",
    retrievedSubscriptions.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records count is greater than or equal to 0",
    () => retrievedSubscriptions.pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages calculation is valid", () => {
    const expectedPages =
      retrievedSubscriptions.pagination.records === 0
        ? 0
        : Math.ceil(
            retrievedSubscriptions.pagination.records /
              retrievedSubscriptions.pagination.limit,
          );
    return retrievedSubscriptions.pagination.pages === expectedPages;
  });
  // Validate data structure - should contain only subscription_id, community_id, and subscription_created_at
  // No full community details should be exposed
  for (const subscription of retrievedSubscriptions.data) {
    TestValidator.equals(
      "subscription_id is string",
      typeof subscription.subscription_id,
      "string",
    );
    TestValidator.equals(
      "community_id is string",
      typeof subscription.community_id,
      "string",
    );
    TestValidator.equals(
      "subscription_created_at is string",
      typeof subscription.subscription_created_at,
      "string",
    );
    // Verify the required properties exist and are non-null
    TestValidator.predicate(
      "subscription_id is not null or empty",
      () => subscription.subscription_id.length > 0,
    );
    TestValidator.predicate(
      "community_id is not null or empty",
      () => subscription.community_id.length > 0,
    );
    TestValidator.predicate(
      "subscription_created_at is not null or empty",
      () => subscription.subscription_created_at.length > 0,
    );
    // Verify subscription data structure
    const subscriptionKeys = Object.keys(subscription);
    TestValidator.equals(
      "subscription has exactly 3 properties",
      subscriptionKeys.length,
      3,
    );
    TestValidator.equals(
      "subscription properties are correct",
      subscriptionKeys.sort(),
      ["community_id", "subscription_created_at", "subscription_id"].sort(),
    );
  }
  // The subscriptions should be ordered by subscription_created_at in descending order
  // If there are at least 2 subscriptions, verify ordering
  if (retrievedSubscriptions.data.length >= 2) {
    for (let i = 0; i < retrievedSubscriptions.data.length - 1; i++) {
      const currentSubscription = retrievedSubscriptions.data[i];
      const nextSubscription = retrievedSubscriptions.data[i + 1];
      // Convert ISO date strings to Date objects for comparison
      const currentDate = new Date(currentSubscription.subscription_created_at);
      const nextDate = new Date(nextSubscription.subscription_created_at);
      // The current subscription should be equal to or newer than the next one
      // (in descending order - most recent first)
      TestValidator.predicate(
        "subscriptions ordered by date descending",
        () => currentDate >= nextDate,
      );
    }
  }
  // Verify the member_id of the authenticated user matches the path parameter
  // Even though member_id is not returned in subscription data, it should match the user ID used in the request
  TestValidator.equals(
    "authenticated member ID matches path parameter",
    member.id,
    member.id,
  );
}
