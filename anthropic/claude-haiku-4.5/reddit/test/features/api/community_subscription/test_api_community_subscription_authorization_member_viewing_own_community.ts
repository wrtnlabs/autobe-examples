import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

/**
 * Test authenticated member can view subscription list for their own community.
 *
 * Validates authorization for community creator to view members. The test
 * creates a member account, authenticates it, creates a community, and then
 * retrieves the subscription list to verify the creator has access to member
 * information.
 *
 * 1. Create and authenticate a member account
 * 2. Create a category for community organization
 * 3. Create a community as this authenticated member
 * 4. Retrieve subscriptions for the community as the same member
 * 5. Verify successful response with proper authorization
 */
export async function test_api_community_subscription_authorization_member_viewing_own_community(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123!";

  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: memberPassword,
        ip: "127.0.0.1",
        href: "http://localhost/join",
        referrer: "http://localhost/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member created successfully",
    memberAuth.id !== null,
  );

  // Step 2: Create a category for community
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10).toLowerCase(),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category created successfully",
    category.id !== null,
  );

  // Step 3: Create a community as the authenticated member
  const communityData = {
    name: RandomGenerator.name(2),
    identifier: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community created successfully",
    community.id !== null,
  );
  TestValidator.equals(
    "community creator matches authenticated member",
    community.creator.id,
    memberAuth.id,
  );

  // Step 4: Retrieve subscriptions for the community as the authenticated member
  const subscriptionRequest = {
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const subscriptions: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: subscriptionRequest,
      },
    );
  typia.assert(subscriptions);

  // Step 5: Verify response structure and authorization
  TestValidator.predicate(
    "subscription response has pagination",
    subscriptions.pagination !== null,
  );
  TestValidator.predicate(
    "subscription list is an array",
    Array.isArray(subscriptions.data),
  );
  TestValidator.predicate(
    "creator has access to community subscriptions",
    subscriptions.data.length >= 1,
  );

  // Verify that the creator member is in the subscription list
  const creatorSubscription = subscriptions.data.find(
    (sub) => sub.member_id === memberAuth.id,
  );
  TestValidator.predicate(
    "creator is subscribed to their own community",
    creatorSubscription !== undefined,
  );
}
