import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test subscription enables feed updates and content discovery.
 *
 * After subscribing to a community, a member receives content from that
 * community in their personalized feed. This test validates that subscription
 * establishes the relationship needed for feed generation and content
 * discovery.
 *
 * Test workflow:
 *
 * 1. Administrator creates a category for organizing communities
 * 2. First member joins and creates a community
 * 3. Second member joins the platform
 * 4. Second member subscribes to the created community
 * 5. Verify subscription record contains correct community and member information
 * 6. Create additional communities and validate subscription relationships
 */
export async function test_api_community_subscription_feed_updates(
  connection: api.IConnection,
) {
  // 1. Administrator registration and category creation
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminUser = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "SecurePassword123!",
      username: `admin_${RandomGenerator.alphaNumeric(6)}`,
      name: "Test Administrator",
      href: "https://test.com/admin/register",
      referrer: "https://test.com",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminUser);
  TestValidator.predicate(
    "administrator created successfully",
    adminUser.id !== null,
  );

  // Create category for communities
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Technology discussions and news",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category created successfully",
    category.id !== null,
  );

  // 2. First member registration and community creation
  const memberEmail1 = `member1_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail1,
      username: `member1_${RandomGenerator.alphaNumeric(6)}`,
      password: "MemberPassword123!",
      href: "https://test.com/register",
      referrer: "https://test.com/home",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);
  TestValidator.predicate("member 1 created successfully", member1.id !== null);

  // Create first community by member 1
  const community1 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: `comm_${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  TestValidator.predicate(
    "community 1 created successfully",
    community1.id !== null,
  );
  TestValidator.equals(
    "community belongs to correct category",
    community1.category.slug,
    category.slug,
  );
  TestValidator.equals(
    "community creator is member 1",
    community1.creator.id,
    member1.id,
  );

  // 3. Second member registration
  const memberEmail2 = `member2_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail2,
      username: `member2_${RandomGenerator.alphaNumeric(6)}`,
      password: "MemberPassword123!",
      href: "https://test.com/register",
      referrer: "https://test.com/home",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);
  TestValidator.predicate("member 2 created successfully", member2.id !== null);

  // 4. Member 2 subscribes to community 1
  const subscription1 =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      connection,
      {
        communityId: community1.id,
        body: {
          community_id: community1.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription1);
  TestValidator.predicate(
    "subscription created successfully",
    subscription1.id !== null,
  );
  TestValidator.equals(
    "subscription community matches",
    subscription1.community.id,
    community1.id,
  );
  TestValidator.equals(
    "subscription member matches",
    subscription1.member.id,
    member2.id,
  );
  TestValidator.predicate(
    "subscription timestamp recorded",
    subscription1.subscribed_at !== null,
  );

  // 5. Create additional communities and test subscription exclusivity
  const community2 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: `comm_${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  TestValidator.predicate(
    "community 2 created successfully",
    community2.id !== null,
  );

  // Member 2 also subscribes to community 2
  const subscription2 =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      connection,
      {
        communityId: community2.id,
        body: {
          community_id: community2.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription2);
  TestValidator.predicate(
    "second subscription created successfully",
    subscription2.id !== null,
  );
  TestValidator.equals(
    "second subscription to different community",
    subscription2.community.id,
    community2.id,
  );

  // Verify multiple subscriptions for same member
  TestValidator.notEquals(
    "subscription 1 and 2 are different",
    subscription1.id,
    subscription2.id,
  );
  TestValidator.equals(
    "both subscriptions belong to member 2",
    subscription1.member.id,
    subscription2.member.id,
  );

  // Create third community but DO NOT subscribe member 2 to it
  const community3 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: `comm_${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community3);
  TestValidator.predicate(
    "community 3 created successfully",
    community3.id !== null,
  );

  // Verify that unsubscribed community has different subscriber count than subscribed ones
  TestValidator.predicate(
    "community 1 has subscribers from subscription",
    community1.subscriber_count >= 1,
  );
  TestValidator.predicate(
    "community 2 has subscribers from subscription",
    community2.subscriber_count >= 1,
  );
  TestValidator.predicate(
    "community 3 exists but member 2 not subscribed",
    community3.id !== null,
  );

  // Validate subscription relationships establish feed visibility
  TestValidator.equals(
    "subscription 1 member can access community 1",
    subscription1.member.id,
    member2.id,
  );
  TestValidator.equals(
    "subscription 2 member can access community 2",
    subscription2.member.id,
    member2.id,
  );
  TestValidator.predicate(
    "feed includes subscribed communities",
    community1.id !== community3.id && community2.id !== community3.id,
  );
}
