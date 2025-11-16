import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

/**
 * Verify that a member user cannot create duplicate subscriptions to the same
 * community.
 *
 * Business goal:
 *
 * - Ensure the backend enforces a uniqueness rule so that a given member user can
 *   have at most one subscription row (typically in an "active"-like status)
 *   for a given community in community_platform_community_subscriptions.
 *
 * Workflow:
 *
 * 1. Register (join) a member user via POST /auth/memberUser/join.
 *
 *    - Use a realistic ICommunityPlatformMemberuser.IJoinRequest with required
 *         fields: username, email, password, href, referrer (ip can be null).
 *    - The join call returns ICommunityPlatformMemberuser.IAuthorized and
 *         automatically attaches the Authorization header to the provided
 *         `connection` via the SDK.
 * 2. Create a community via POST /communityPlatform/memberUser/communities.
 *
 *    - Use ICommunityPlatformCommunity.ICreate with a unique identifier, reasonable
 *         title, optional description, visibilityLevelCode, isNsfw flag, and
 *         optional primaryTagIds.
 *    - Store the returned ICommunityPlatformCommunity to get its `id`.
 * 3. Create the first subscription via POST
 *    /communityPlatform/memberUser/subscriptions.
 *
 *    - Call api.functional.communityPlatform.memberUser.subscriptions.create with
 *         body satisfying ICommunityPlatformCommunitySubscription.ICreate: {
 *         community_id: community.id, status: "active" } (or similar).
 *    - Assert the response with typia.assert and keep its id and fields.
 * 4. Attempt to create a duplicate subscription for the same community and same
 *    member.
 *
 *    - Call the same create endpoint again with the same community_id and status.
 *    - This is expected to fail at the business rule layer because a subscription
 *         already exists for this member-community pair. We only assert that an
 *         error occurs, not its HTTP status.
 * 5. Search subscriptions via PATCH /communityPlatform/memberUser/subscriptions.
 *
 *    - Use the index endpoint with a request body satisfying
 *         ICommunityPlatformCommunitySubscription.IRequest, including filters:
 *
 *         - CommunityId: community.id
 *         - MemberUserId: authorized member id
 *         - Plus basic pagination (page/pageSize).
 *    - Assert the paginated response via typia.assert and inspect `data`.
 *    - Assert with TestValidator.predicate that exactly one subscription entry
 *         exists for that member-community pair.
 */
export async function test_api_member_subscriptions_create_prevents_duplicate_active_subscription(
  connection: api.IConnection,
) {
  // 1. Register a member user (join) to obtain an authenticated member context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community using the member user context.
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create the first subscription to this community for the authenticated member.
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const firstSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert(firstSubscription);

  // 4. Attempt to create a duplicate subscription for the same community.
  await TestValidator.error(
    "duplicate community subscription should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.subscriptions.create(
        connection,
        {
          body: {
            community_id: community.id,
            status: "active",
          } satisfies ICommunityPlatformCommunitySubscription.ICreate,
        },
      );
    },
  );

  // 5. Query subscriptions for the authenticated member and specific community
  //    to ensure only one subscription exists.
  const searchBody = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 20 as number & tags.Type<"int32">,
    communityId: community.id,
    memberUserId: memberAuthorized.id,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const pageResult: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.memberUser.subscriptions.index(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(pageResult);

  TestValidator.predicate(
    "there must be exactly one subscription for the member-community pair",
    pageResult.data.length === 1,
  );

  const retrieved = pageResult.data[0];
  TestValidator.equals(
    "retrieved subscription community id matches created community",
    retrieved.community.id,
    community.id,
  );
  TestValidator.equals(
    "retrieved subscription status matches initial subscription status",
    retrieved.status,
    firstSubscription.status,
  );
}
