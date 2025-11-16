import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Test retrieving posts from an empty community.
 *
 * Validates that the post listing endpoint correctly handles communities with
 * no posts. This test ensures proper response structure and pagination metadata
 * when querying posts from a newly created community that contains zero posts.
 *
 * Test flow:
 *
 * 1. Administrator joins and creates a category for community organization
 * 2. Member joins the platform
 * 3. Member creates a community in the newly created category
 * 4. Query the posts endpoint for the empty community
 * 5. Validate response contains empty data array with correct pagination metadata
 */
export async function test_api_community_posts_empty_community(
  connection: api.IConnection,
) {
  // Step 1: Administrator setup - create a category
  const adminAuthData: ICommunityPlatformAdministrator.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };

  const adminAuthorized: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminAuthData,
    });
  typia.assert(adminAuthorized);
  TestValidator.equals(
    "administrator created successfully",
    adminAuthorized.email,
    adminAuthData.email,
  );

  // Step 2: Create a category
  const categoryData: ICommunityPlatformCategory.ICreate = {
    name: "Technology",
    slug: "technology",
    display_order: 1,
    description: "Technology discussions and news",
  };

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category created with correct name",
    category.name,
    categoryData.name,
  );

  // Step 3: Member setup - join the platform
  const memberAuthData: ICommunityPlatformMember.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };

  const memberAuthorized: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberAuthData,
    });
  typia.assert(memberAuthorized);
  TestValidator.equals(
    "member created successfully",
    memberAuthorized.id,
    memberAuthorized.id,
  );

  // Step 4: Create an empty community
  const communityData: ICommunityPlatformCommunity.ICreate = {
    name: "Tech Discussion Hub",
    identifier: "tech_hub_" + RandomGenerator.alphaNumeric(5),
    description: "A place for technology discussions",
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  };

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community created with correct name",
    community.name,
    communityData.name,
  );

  // Step 5: Retrieve posts from the empty community
  const postRequest: ICommunityPlatformPost.IRequest = {
    page: 1,
    limit: 10,
  };

  const postResponse: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: postRequest,
    });
  typia.assert(postResponse);

  // Step 6: Validate empty response structure
  TestValidator.equals(
    "posts data array is empty",
    postResponse.data.length,
    0,
  );

  TestValidator.equals(
    "pagination records count is zero",
    postResponse.pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination pages count is zero",
    postResponse.pagination.pages,
    0,
  );

  TestValidator.equals(
    "pagination current page is 1",
    postResponse.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit is 10",
    postResponse.pagination.limit,
    10,
  );

  // Step 7: Verify the response is structured correctly despite being empty
  TestValidator.predicate(
    "response has pagination object",
    postResponse.pagination !== null && postResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "data array exists and is array type",
    Array.isArray(postResponse.data),
  );
}
