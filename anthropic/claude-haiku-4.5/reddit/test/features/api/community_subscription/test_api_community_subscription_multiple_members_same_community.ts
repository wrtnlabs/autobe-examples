import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_subscription_multiple_members_same_community(
  connection: api.IConnection,
) {
  // 1. Register first member (Member A)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAData = {
    email: memberAEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberA = await api.functional.auth.member.join(connection, {
    body: memberAData,
  });
  typia.assert(memberA);

  // 2. Register second member (Member B)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBData = {
    email: memberBEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberB = await api.functional.auth.member.join(connection, {
    body: memberBData,
  });
  typia.assert(memberB);

  // 3. Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin/join",
    referrer: "http://localhost:3000/admin",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // 4. Create category for community classification
  const categoryData = {
    name: RandomGenerator.name(),
    slug: RandomGenerator.alphabets(10).toLowerCase(),
    display_order: 1,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // 5. Switch to Member A to create community (Member A becomes creator)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberAEmail,
      password: memberAData.password,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 6. Member A creates a community (automatically subscribed as creator)
  const communityData = {
    name: RandomGenerator.name(2),
    identifier: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // Verify community has creator auto-subscribed
  TestValidator.equals(
    "community should have initial subscriber count of 1 (creator auto-subscribed)",
    community.subscriber_count,
    1,
  );

  // 7. Switch to Member B
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberBEmail,
      password: memberBData.password,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 8. Member B subscribes to the same community
  const subscriptionB =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscriptionB);

  // 9. Validate Member B subscription details
  TestValidator.equals(
    "Member B subscription should reference correct community ID",
    subscriptionB.community.id,
    community.id,
  );
  TestValidator.equals(
    "Member B subscription should reference correct member ID",
    subscriptionB.member.id,
    memberB.id,
  );

  // 10. Validate Member B subscription timestamp
  TestValidator.predicate(
    "Member B subscription should have valid subscribed_at timestamp",
    subscriptionB.subscribed_at !== null &&
      subscriptionB.subscribed_at !== undefined,
  );

  // 11. Switch back to Member A to retrieve their subscription
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberAEmail,
      password: memberAData.password,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 12. Member A also explicitly subscribes to community
  const subscriptionA =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscriptionA);

  // 13. Validate Member A subscription details
  TestValidator.equals(
    "Member A subscription should reference correct community ID",
    subscriptionA.community.id,
    community.id,
  );
  TestValidator.equals(
    "Member A subscription should reference correct member ID",
    subscriptionA.member.id,
    memberA.id,
  );

  // 14. Validate Member A subscription timestamp
  TestValidator.predicate(
    "Member A subscription should have valid subscribed_at timestamp",
    subscriptionA.subscribed_at !== null &&
      subscriptionA.subscribed_at !== undefined,
  );

  // 15. Validate both subscriptions have unique IDs (independent records)
  TestValidator.notEquals(
    "subscription IDs should be unique for different members",
    subscriptionA.id,
    subscriptionB.id,
  );

  // 16. Validate member details in subscriptions are independent
  TestValidator.notEquals(
    "Member A and Member B subscriptions should have different member usernames",
    subscriptionA.member.username,
    subscriptionB.member.username,
  );
  TestValidator.notEquals(
    "Member A and Member B subscriptions should have different member IDs",
    subscriptionA.member.id,
    subscriptionB.member.id,
  );

  // 17. Validate community information in both subscriptions is identical (same community)
  TestValidator.equals(
    "both subscriptions should reference same community identifier",
    subscriptionA.community.identifier,
    subscriptionB.community.identifier,
  );
  TestValidator.equals(
    "both subscriptions should reference same community name",
    subscriptionA.community.name,
    subscriptionB.community.name,
  );
  TestValidator.equals(
    "both subscriptions should reference same community ID",
    subscriptionA.community.id,
    subscriptionB.community.id,
  );

  // 18. Validate subscription records represent M:N relationship
  TestValidator.predicate(
    "Member A subscription should have ISummary member info with username",
    subscriptionA.member.username !== null &&
      subscriptionA.member.username !== undefined,
  );
  TestValidator.predicate(
    "Member B subscription should have ISummary member info with username",
    subscriptionB.member.username !== null &&
      subscriptionB.member.username !== undefined,
  );
}
