import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that an authenticated member user can retrieve the full details of
 * one of their own community subscriptions through the member-scoped
 * subscription detail endpoint.
 *
 * Business flow covered by this test:
 *
 * 1. Register a new member user with /auth/memberUser/join and obtain an
 *    authenticated memberUser context (token is handled automatically by SDK).
 * 2. Using that memberUser context, create a new community via POST
 *    /communityPlatform/memberUser/communities with a valid
 *    ICommunityPlatformCommunity.ICreate payload.
 * 3. Create a new subscription for that member to the created community via POST
 *    /communityPlatform/memberUser/members/{memberUserId}/subscriptions using a
 *    valid ICommunityPlatformCommunitySubscription.ICreate body.
 * 4. Call GET
 *    /communityPlatform/memberUser/members/{memberUserId}/subscriptions/{subscriptionId}
 *    with the same authenticated member and path parameters for memberUserId
 *    and subscriptionId taken from previous responses.
 *
 * Assertions:
 *
 * - The response DTO type matches ICommunityPlatformCommunitySubscription.
 * - The subscription.id equals the subscriptionId returned at creation.
 * - The embedded memberUser summary id equals the memberUserId from join.
 * - The embedded community summary id and slug equal the created community.
 * - Is_active and receive_notifications equal the values set at creation.
 * - Created_at and updated_at are populated (valid date-time strings).
 * - Deleted_at is null or undefined for an active, non-deleted subscription.
 */
export async function test_api_member_subscription_detail_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) and obtain authorized context
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a new community owned by this member user
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 12,
    }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a subscription for this member to the created community
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const createdSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId: member.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(createdSubscription);

  // 4. Retrieve the subscription detail via the GET endpoint
  const fetchedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.at(
      connection,
      {
        memberUserId: member.id,
        subscriptionId: createdSubscription.id,
      },
    );
  typia.assert(fetchedSubscription);

  // 5. Business-level assertions on the fetched subscription
  TestValidator.equals(
    "subscription id matches the created subscription",
    fetchedSubscription.id,
    createdSubscription.id,
  );

  TestValidator.equals(
    "subscription memberUser summary id matches member.id",
    fetchedSubscription.memberUser.id,
    member.id,
  );

  TestValidator.equals(
    "subscription community id matches created community id",
    fetchedSubscription.community.id,
    community.id,
  );

  TestValidator.equals(
    "subscription community slug matches created community slug",
    fetchedSubscription.community.slug,
    community.slug,
  );

  TestValidator.equals(
    "is_active flag matches creation payload",
    fetchedSubscription.is_active,
    subscriptionCreateBody.is_active,
  );

  TestValidator.equals(
    "receive_notifications flag matches creation payload",
    fetchedSubscription.receive_notifications,
    subscriptionCreateBody.receive_notifications,
  );

  await TestValidator.predicate(
    "created_at is a non-empty string",
    async () => fetchedSubscription.created_at.length > 0,
  );

  await TestValidator.predicate(
    "updated_at is a non-empty string",
    async () => fetchedSubscription.updated_at.length > 0,
  );

  await TestValidator.predicate(
    "deleted_at is null or undefined for active subscription",
    async () =>
      fetchedSubscription.deleted_at === null ||
      fetchedSubscription.deleted_at === undefined,
  );
}
