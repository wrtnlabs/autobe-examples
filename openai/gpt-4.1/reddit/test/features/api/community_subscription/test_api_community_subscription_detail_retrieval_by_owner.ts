import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates that a newly registered user can retrieve the details of their own
 * community subscription using the subscription's ID, with correct ownership,
 * association, and timestamps.
 *
 * Steps:
 *
 * 1. Register User A and authenticate.
 * 2. Create a Community as User A.
 * 3. Subscribe User A to the community.
 * 4. Retrieve the subscription detail using GET by the subscription ID and verify
 *    all details (user, community, timestamps, status).
 * 5. Register User B as an additional actor.
 * 6. As User B, attempt to fetch User A's subscription and expect a permission
 *    error.
 * 7. Attempt to fetch a non-existent subscription ID and expect an error.
 */
export async function test_api_community_subscription_detail_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Register User A and authenticate
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = RandomGenerator.alphaNumeric(12);
  const userA: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userAEmail,
        password: userAPassword,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(userA);

  // 2. Create a Community as User A
  const communityCreate = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    visibility: RandomGenerator.pick([
      "public",
      "private",
      "invite-only",
    ] as const),
    image_url: null,
    status: RandomGenerator.pick([
      "active",
      "archived",
      "banned",
      "pending approval",
    ] as const),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // 3. Subscribe User A to the Community
  const subscriptionCreate = {
    community_id: community.id,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;
  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.user.communitySubscriptions.create(
      connection,
      {
        body: subscriptionCreate,
      },
    );
  typia.assert(subscription);

  // 4. Retrieve the subscription detail and validate
  const fetched: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.user.communitySubscriptions.at(
      connection,
      {
        communitySubscriptionId: subscription.id,
      },
    );
  typia.assert(fetched);
  // Validate user and community associations
  TestValidator.equals(
    "subscription user is correct",
    fetched.user.id,
    userA.id,
  );
  TestValidator.equals(
    "subscription community is correct",
    fetched.community.id,
    community.id,
  );
  // Validate timestamps and soft delete (should be null for active)
  TestValidator.equals(
    "subscription deleted_at is null",
    fetched.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof fetched.created_at === "string" &&
      !Number.isNaN(Date.parse(fetched.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof fetched.updated_at === "string" &&
      !Number.isNaN(Date.parse(fetched.updated_at)),
  );

  // 5. Register User B, authenticate (simulate a second account)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = RandomGenerator.alphaNumeric(12);
  const userB: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(
      { ...connection, headers: {} },
      {
        body: {
          email: userBEmail,
          password: userBPassword,
        } satisfies ICommunityPlatformUser.IJoin,
      },
    );
  typia.assert(userB);

  // 6. As User B, attempt to access User A's subscription and expect failure
  await TestValidator.error(
    "non-owner cannot fetch another user's subscription",
    async () => {
      await api.functional.communityPlatform.user.communitySubscriptions.at(
        connection,
        {
          communitySubscriptionId: subscription.id,
        },
      );
    },
  );

  // 7. Attempt to fetch a non-existent subscription and expect error
  await TestValidator.error(
    "fetching non-existent subscription fails",
    async () => {
      await api.functional.communityPlatform.user.communitySubscriptions.at(
        connection,
        {
          communitySubscriptionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
