import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunitySubscriptionNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscriptionNotifications";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate authenticated retrieval of detailed community subscription
 * information by its owner.
 *
 * Verifies that an authenticated user, after registering, can:
 *
 * 1. Register a new user account using a random valid email, password, display
 *    name, and session audit URLs
 * 2. Create a new community with a unique canonical name and description
 * 3. Subscribe to the newly-created community (with default notifications enabled)
 * 4. Retrieve their subscription's details by subscriptionId via GET
 *    /communityPlatform/user/subscriptions/{subscriptionId}
 *
 * The test asserts:
 *
 * - Returned subscription id matches the one just created
 * - Linked user_id matches the registered user's id
 * - Linked community_id matches the created community's id and embedded summary
 *   matches the community's metadata
 * - Notification settings are present and reflect default or explicitly set
 *   preferences
 * - Created_at and updated_at fields are well-formed (date-time)
 * - Deleted_at is null (active subscription)
 */
export async function test_api_community_subscription_detail_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Create and authenticate new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const displayName = RandomGenerator.name();
  const joinInput = {
    email,
    password,
    display_name: displayName,
    href: "https://autobe.community/join",
    referrer: "https://autobe.community/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(user);
  TestValidator.equals(
    "user email matches registration input",
    user.email,
    email,
  );
  TestValidator.equals(
    "user display_name matches registration input",
    user.display_name,
    displayName,
  );
  TestValidator.predicate(
    "user id is uuid",
    typeof user.id === "string" && user.id.length > 0,
  );
  TestValidator.predicate(
    "token provided on join",
    typeof user.token?.access === "string" && user.token.access.length > 0,
  );

  // 2. Create a new community
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityDescription = RandomGenerator.paragraph({
    sentences: 12,
    wordMin: 3,
    wordMax: 8,
  });
  const createCommunityInput = {
    name: communityName as string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">,
    description: communityDescription as string &
      tags.MinLength<1> &
      tags.MaxLength<250>,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: createCommunityInput,
    });
  typia.assert(community);
  TestValidator.equals(
    "community name matches submitted input",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community description matches submitted input",
    community.description,
    communityDescription,
  );
  TestValidator.equals(
    "community creator matches user id",
    community.creator_user_id,
    user.id,
  );
  TestValidator.equals("community id is uuid", typeof community.id, "string");

  // 3. Subscribe the user to the new community
  const subInput = {
    community_id: community.id,
    notification_enabled: true, // Explicitly enable notification on subscribe
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;
  const createdSub =
    await api.functional.communityPlatform.user.subscriptions.create(
      connection,
      {
        body: subInput,
      },
    );
  typia.assert(createdSub);
  TestValidator.equals(
    "subscription user_id matches owner",
    createdSub.user_id,
    user.id,
  );
  TestValidator.equals(
    "subscription community_id matches input",
    createdSub.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription community summary id matches community id",
    createdSub.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscription community summary name",
    createdSub.community.name,
    communityName,
  );
  TestValidator.equals(
    "subscription community summary description",
    createdSub.community.description,
    communityDescription,
  );
  TestValidator.predicate(
    "subscription notification_enabled true",
    createdSub.notification_settings.notification_enabled === true,
  );
  TestValidator.equals("subscription not deleted", createdSub.deleted_at, null);

  // 4. Retrieve the subscription detail using GET by subscriptionId
  const read = await api.functional.communityPlatform.user.subscriptions.at(
    connection,
    {
      subscriptionId: createdSub.id,
    },
  );
  typia.assert(read);
  TestValidator.equals(
    "read subscription by id matches created subscription",
    read.id,
    createdSub.id,
  );
  TestValidator.equals("read user_id matches", read.user_id, user.id);
  TestValidator.equals(
    "read community_id matches",
    read.community_id,
    community.id,
  );
  TestValidator.equals(
    "read community summary",
    read.community,
    createdSub.community,
  );
  TestValidator.equals(
    "read notification_settings",
    read.notification_settings,
    createdSub.notification_settings,
  );
  TestValidator.equals("read deleted_at null (active)", read.deleted_at, null);
  TestValidator.predicate(
    "read timestamps are well-formed",
    typeof read.created_at === "string" &&
      typeof read.updated_at === "string" &&
      read.created_at.length > 0 &&
      read.updated_at.length > 0,
  );
}
