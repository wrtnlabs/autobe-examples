import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that community creator can retrieve their private community.
 *
 * This test validates the private community retrieval workflow:
 *
 * 1. Set up administrator account for category creation
 * 2. Create a category for community classification
 * 3. Create a member account to serve as community creator
 * 4. Create a private community with restricted settings
 * 5. Retrieve the private community and verify HTTP 200 response
 * 6. Validate complete community information is returned
 * 7. Confirm creator access is always allowed regardless of subscription status
 */
export async function test_api_community_retrieval_private_community_by_creator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: "AdminPassword123!",
    username: RandomGenerator.alphabets(10),
    name: "Admin User",
    href: "http://localhost:3000/admin/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAccount = await api.functional.auth.administrator.join(
    connection,
    {
      body: adminData,
    },
  );
  typia.assert(adminAccount);

  // Step 2: Create a category for community classification
  const categoryData = {
    name: "Technology",
    slug: "technology",
    description: "Technology and programming discussions",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category created successfully",
    category.slug,
    "technology",
  );

  // Step 3: Create member account who will be the community creator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(10),
    password: "MemberPassword123!",
    href: "http://localhost:3000/member/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAccount = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAccount);

  // Step 3b: Login as member to switch authentication context
  const memberLoginData = {
    email: memberEmail,
    password: "MemberPassword123!",
    href: "http://localhost:3000/member/login",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ILogin;

  const memberLogin = await api.functional.auth.member.login(connection, {
    body: memberLoginData,
  });
  typia.assert(memberLogin);

  // Step 4: Create a private community with restricted settings
  const communityData = {
    name: "Private Tech Community",
    identifier: RandomGenerator.alphabets(8).toLowerCase(),
    description: "A private community for advanced tech discussions",
    visibility: "private" as const,
    post_creation_restriction: "moderators_only" as const,
    post_type_restriction: "text_and_images" as const,
    category_slug: "technology",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const privateComm =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(privateComm);
  TestValidator.equals(
    "community visibility is private",
    privateComm.visibility,
    "private",
  );
  TestValidator.equals(
    "community creator is correct",
    privateComm.creator.id,
    memberAccount.id,
  );

  // Step 5: Retrieve the private community and validate HTTP 200 response
  const retrievedComm = await api.functional.communityPlatform.communities.at(
    connection,
    {
      communityId: privateComm.id,
    },
  );
  typia.assert(retrievedComm);

  // Step 6: Validate complete community information is returned
  TestValidator.equals(
    "retrieved community ID matches",
    retrievedComm.id,
    privateComm.id,
  );
  TestValidator.equals(
    "retrieved community identifier matches",
    retrievedComm.identifier,
    communityData.identifier,
  );
  TestValidator.equals(
    "retrieved community name matches",
    retrievedComm.name,
    communityData.name,
  );
  TestValidator.equals(
    "retrieved community visibility is private",
    retrievedComm.visibility,
    "private",
  );
  TestValidator.equals(
    "retrieved community description matches",
    retrievedComm.description,
    communityData.description,
  );
  TestValidator.equals(
    "retrieved post creation restriction matches",
    retrievedComm.post_creation_restriction,
    "moderators_only",
  );
  TestValidator.equals(
    "retrieved post type restriction matches",
    retrievedComm.post_type_restriction,
    "text_and_images",
  );
  TestValidator.equals(
    "retrieved category slug matches",
    retrievedComm.category.slug,
    "technology",
  );
  TestValidator.equals(
    "retrieved creator ID matches",
    retrievedComm.creator.id,
    memberAccount.id,
  );
  TestValidator.predicate(
    "community has creator username",
    retrievedComm.creator.username === memberData.username,
  );
  TestValidator.predicate(
    "community creator email matches",
    retrievedComm.creator.email === memberEmail,
  );

  // Step 7: Confirm creator access is always allowed regardless of subscription status
  TestValidator.predicate(
    "creator successfully retrieved private community",
    retrievedComm.id === privateComm.id,
  );
  TestValidator.equals(
    "subscriber count includes creator",
    retrievedComm.subscriber_count,
    1,
  );
  TestValidator.predicate(
    "community timestamps are present",
    retrievedComm.created_at !== undefined &&
      retrievedComm.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is not set for active community",
    retrievedComm.deleted_at === null || retrievedComm.deleted_at === undefined,
  );
}
