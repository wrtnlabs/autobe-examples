import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

/**
 * Validate behavior when deleting a non-existent community subscription.
 *
 * Business goal:
 *
 * - Ensure that DELETE
 *   /communityPlatform/memberUser/subscriptions/{subscriptionId} gracefully
 *   handles attempts to unsubscribe using a non-existent subscription id.
 * - Confirm no side effects occur on existing subscriptions owned by the same
 *   member.
 *
 * High-level flow:
 *
 * 1. Create and authenticate a platform admin (for visibility level setup).
 * 2. As platform admin, create a community visibility level that member-created
 *    communities can reference.
 * 3. Create and authenticate a member user.
 * 4. As the member user, create a community that uses the visibility level from
 *    step 2.
 * 5. As the same member user, create a real subscription to that community; this
 *    will act as control data to verify no unintended deletions.
 * 6. Generate a random UUID to act as a clearly non-existent subscriptionId that
 *    should not match any existing subscription for this user.
 * 7. Call DELETE /communityPlatform/memberUser/subscriptions/{subscriptionId}
 *    using the non-existent subscriptionId while authenticated as the member
 *    user, and assert that an HTTP error is thrown (using
 *    TestValidator.error).
 *
 *    - Do not assert specific HTTP status codes; only validate that an error occurs.
 * 8. After the failed deletion, call PATCH
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/subscriptions
 *    with a simple request body to fetch that member’s subscriptions.
 * 9. Verify via TestValidator that the previously created real subscription still
 *    exists in the returned page data (e.g., by matching its id).
 *
 * DTO and API usage mapping:
 *
 * - Platform admin join: api.functional.auth.platformAdmin.join
 *
 *   - Request body: ICommunityPlatformPlatformadmin.IJoin
 *   - Response: ICommunityPlatformPlatformadmin.IAuthorized (contains token and
 *       admin id).
 * - Community visibility level creation (admin):
 *   api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create
 *
 *   - Request body: ICommunityPlatformCommunityVisibilityLevel.ICreate
 *   - Response: ICommunityPlatformCommunityVisibilityLevel
 *   - The code property from this response will be used when creating a community.
 * - Member user join: api.functional.auth.memberUser.join
 *
 *   - Request body: ICommunityPlatformMemberuser.IJoinRequest
 *   - Response: ICommunityPlatformMemberuser.IAuthorized
 * - Community creation (member):
 *   api.functional.communityPlatform.memberUser.communities.create
 *
 *   - Request body: ICommunityPlatformCommunity.ICreate
 *   - Response: ICommunityPlatformCommunity (full community entity).
 * - Subscription creation (member):
 *   api.functional.communityPlatform.memberUser.subscriptions.create
 *
 *   - Request body: ICommunityPlatformCommunitySubscription.ICreate
 *   - Response: ICommunityPlatformCommunitySubscription
 * - Subscription deletion (member):
 *   api.functional.communityPlatform.memberUser.subscriptions.erase
 *
 *   - Path param: subscriptionId (string UUID).
 *   - Response: void.
 *   - For non-existent id, we expect an error to be thrown.
 * - Subscription index for a member:
 *   api.functional.communityPlatform.memberUser.memberUsers.subscriptions.index
 *
 *   - Path param: memberUserId (UUID from member IAuthorized.id).
 *   - Body: ICommunityPlatformCommunitySubscription.IRequest
 *   - Response: IPageICommunityPlatformCommunitySubscription.ISummary whose data[]
 *       is ICommunityPlatformCommunitySubscription.ISummary.
 *
 * Data generation strategy:
 *
 * - Use RandomGenerator and typia.random for realistic yet valid test data,
 *   ensuring that DTO constraints and relationships are respected. Override
 *   specific fields when necessary (e.g., visibilityLevelCode, community ids).
 *
 * Assertion and error handling strategy:
 *
 * - Always call typia.assert on non-void API responses to strictly validate
 *   response types.
 * - Use TestValidator.error("title", async () => { ... }) around the DELETE call
 *   with a non-existent subscriptionId to assert that an error is thrown, but
 *   do not rely on specific HTTP status codes.
 * - After the failed delete, call the index endpoint and verify via
 *   TestValidator.predicate that the control subscription id is still present
 *   in the returned page data.
 */
export async function test_api_member_subscription_delete_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Register a platform admin for visibility level setup
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level as platform admin
  const visibilityBody = {
    code: `public-${RandomGenerator.alphabets(6)}`,
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 3. Register a member user
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.test` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://app.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://app.example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create a community as the member user using the created visibility level
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Create a real subscription as control data
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert(subscription);

  // 6. Generate a clearly non-existent subscriptionId (random UUID)
  const nonexistentSubscriptionId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 7. Attempt to delete using the non-existent subscriptionId and
  //    assert that an error occurs
  await TestValidator.error(
    "deleting non-existent subscriptionId must throw error",
    async () => {
      await api.functional.communityPlatform.memberUser.subscriptions.erase(
        connection,
        { subscriptionId: nonexistentSubscriptionId },
      );
    },
  );

  // 8. List subscriptions for the member user to verify the real subscription
  const indexRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 10 as number & tags.Type<"int32">,
    sortBy: undefined,
    sortDirection: undefined,
    memberUserId: memberAuthorized.id,
    communityId: community.id,
    status: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const subscriptionPage: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.index(
      connection,
      {
        memberUserId: memberAuthorized.id,
        body: indexRequestBody,
      },
    );
  typia.assert(subscriptionPage);

  // 9. Verify that the original subscription is still present
  const stillExists = subscriptionPage.data.some(
    (item) => item.id === subscription.id,
  );

  TestValidator.predicate(
    "control subscription must remain after failed deletion of non-existent id",
    stillExists,
  );
}
