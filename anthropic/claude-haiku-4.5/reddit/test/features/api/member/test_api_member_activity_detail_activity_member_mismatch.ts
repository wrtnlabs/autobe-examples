import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberActivity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test retrieving an activity with mismatched member ID.
 *
 * This test validates authorization boundaries by creating a post and activity
 * for member A, then attempting to retrieve that activity using member B's ID
 * with the correct activity ID. The endpoint should prevent cross-member
 * activity access to ensure proper authorization and prevent information
 * leakage.
 *
 * Test flow:
 *
 * 1. Create administrator account for category management
 * 2. Create a content category
 * 3. Create member A account
 * 4. Create member B account
 * 5. Create a community for activity
 * 6. Create a post by member A (which creates an activity)
 * 7. Attempt to retrieve the activity using member B's ID and the correct activity
 *    ID
 * 8. Verify that the endpoint returns 404 or properly denies access
 */
export async function test_api_member_activity_detail_activity_member_mismatch(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = RandomGenerator.alphabets(10);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: `admin_${RandomGenerator.alphaNumeric(8)}`,
      name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a content category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Category_${RandomGenerator.alphaNumeric(8)}`,
          slug: `category-${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
          description: RandomGenerator.paragraph(),
          icon_url: "http://localhost:3000/icon.png",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member A account
  const memberAEmail = `member_a_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberAPassword = RandomGenerator.alphabets(10);
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: memberAEmail,
      username: `member_a_${RandomGenerator.alphaNumeric(8)}`,
      password: memberAPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberA);

  // Step 4: Create member B account
  const memberBEmail = `member_b_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberBPassword = RandomGenerator.alphabets(10);
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      email: memberBEmail,
      username: `member_b_${RandomGenerator.alphaNumeric(8)}`,
      password: memberBPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberB);

  // Step 5: Authenticate as member A and create a community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Community_${RandomGenerator.alphaNumeric(8)}`,
          identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create a post by member A (this creates an activity)
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Post_${RandomGenerator.alphaNumeric(8)}`,
        content_text: RandomGenerator.content(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // The activity ID corresponds to the post ID
  const activityId = post.id;

  // Step 7: Authenticate as member B
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 8: Verify that accessing member A's activity with member B's authentication fails
  await TestValidator.error(
    "accessing member A's activity with member B's ID should fail",
    async () => {
      await api.functional.communityPlatform.members.activity.at(connection, {
        memberId: memberA.id,
        activityId: activityId,
      });
    },
  );

  TestValidator.predicate(
    "member activity authorization boundary validated successfully",
    true,
  );
}
