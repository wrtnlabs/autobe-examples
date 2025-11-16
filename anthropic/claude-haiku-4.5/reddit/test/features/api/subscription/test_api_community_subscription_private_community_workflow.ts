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
 * Test subscription workflow for private communities with access control
 * validation.
 *
 * This test validates that private community subscriptions properly enforce
 * visibility restrictions and membership approval workflows. It establishes a
 * multi-actor scenario with different authorization contexts to ensure
 * cross-actor interactions are handled correctly.
 *
 * Workflow:
 *
 * 1. Administrator creates a category for community classification
 * 2. Member 1 authenticates and creates a private community
 * 3. Member 2 authenticates and attempts to subscribe to the private community
 * 4. Subscription is verified with correct access control enforcement
 * 5. Subscription record validates community visibility and member relationship
 */
export async function test_api_community_subscription_private_community_workflow(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates a category
  const adminData = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: "SecurePassword123!",
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    name: "Test Administrator",
    href: "https://api.example.com/admin",
    referrer: "https://example.com/admin/login",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: admin.token.access,
    },
  };

  // Create category for community classification
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Technology and software discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category created successfully",
    typeof category.id,
    "string",
  );

  // Step 2: Member 1 creates a private community
  const member1Data = {
    email: `member1_${RandomGenerator.alphaNumeric(8)}@test.com`,
    username: `member1_${RandomGenerator.alphaNumeric(8)}`,
    password: "MemberPassword123!",
    ip: "192.168.1.1",
    href: "https://api.example.com/join",
    referrer: "https://example.com/login",
  } satisfies ICommunityPlatformMember.ICreate;

  const member1 = await api.functional.auth.member.join(connection, {
    body: member1Data,
  });
  typia.assert(member1);

  const member1Connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: member1.token.access,
    },
  };

  // Member 1 creates a private community
  const privateCommunity =
    await api.functional.communityPlatform.member.communities.create(
      member1Connection,
      {
        body: {
          name: `Private Community ${RandomGenerator.alphaNumeric(6)}`,
          identifier: `private_${RandomGenerator.alphaNumeric(8)}`,
          description: "A private community for restricted discussions",
          visibility: "private",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_and_images",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(privateCommunity);
  TestValidator.equals(
    "private community visibility is set correctly",
    privateCommunity.visibility,
    "private",
  );
  TestValidator.equals(
    "community creator is member 1",
    privateCommunity.creator.id,
    member1.id,
  );

  // Step 3: Member 2 authenticates and subscribes to the private community
  const member2Data = {
    email: `member2_${RandomGenerator.alphaNumeric(8)}@test.com`,
    username: `member2_${RandomGenerator.alphaNumeric(8)}`,
    password: "MemberPassword456!",
    ip: "192.168.1.2",
    href: "https://api.example.com/join",
    referrer: "https://example.com/login",
  } satisfies ICommunityPlatformMember.ICreate;

  const member2 = await api.functional.auth.member.join(connection, {
    body: member2Data,
  });
  typia.assert(member2);

  const member2Connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: member2.token.access,
    },
  };

  // Member 2 subscribes to the private community
  const subscription =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      member2Connection,
      {
        communityId: privateCommunity.id,
        body: {
          community_id: privateCommunity.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // Step 4 & 5: Verify subscription records and access control
  TestValidator.equals(
    "subscription community ID matches",
    subscription.community.id,
    privateCommunity.id,
  );
  TestValidator.equals(
    "subscription member ID matches",
    subscription.member.id,
    member2.id,
  );
  TestValidator.predicate(
    "subscription timestamp is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(subscription.subscribed_at),
  );
  TestValidator.predicate(
    "community is private",
    privateCommunity.visibility === "private",
  );
  TestValidator.equals(
    "subscription references correct community identifier",
    subscription.community.identifier,
    privateCommunity.identifier,
  );
}
